import type { MemberRole } from '../../../generated/prisma/client';
import type { ServiceDeps } from '../../deps';
import { badRequest, conflict, forbidden, isPrismaError, notFound } from '../../errors';
import { toMessageDTO } from '../../lib/dto';
import { roomTopic, userTopic } from '../realtime/bus';
import { invalidateMembership, isMember } from './membership';
import { onlineAmong } from '../presence/service';

export async function requireMember(deps: ServiceDeps, userId: string, roomId: string) {
    if (!(await isMember(deps, userId, roomId))) throw forbidden('Not a member of this room');
}

export async function createGroup(deps: ServiceDeps, creatorId: string, name: string, memberIds: string[]) {
    const others = [...new Set(memberIds)].filter((id) => id !== creatorId);
    const found = await deps.prisma.user.count({ where: { id: { in: others } } });
    if (found !== others.length) throw badRequest('One or more users do not exist');

    const room = await deps.prisma.room.create({
        data: {
            kind: 'GROUP',
            name,
            members: {
                create: [
                    { userId: creatorId, role: 'OWNER' },
                    ...others.map((userId) => ({ userId })),
                ],
            },
        },
    });
    await Promise.all(others.map((id) => deps.bus.publish(userTopic(id), { type: 'room.added', roomId: room.id }).catch(() => {})));
    return room;
}

// A DM is a room with exactly two members. The sorted-pair dmKey is unique, so
// two concurrent "start DM" calls can only ever create one room.
export async function getOrCreateDm(deps: ServiceDeps, userId: string, otherId: string) {
    if (userId === otherId) throw badRequest('Cannot DM yourself');
    if (!(await deps.prisma.user.findUnique({ where: { id: otherId }, select: { id: true } }))) {
        throw notFound('User not found');
    }
    const dmKey = [userId, otherId].sort().join(':');
    const existing = await deps.prisma.room.findUnique({ where: { dmKey } });
    if (existing) return { room: existing, created: false };

    try {
        const room = await deps.prisma.room.create({
            data: {
                kind: 'DIRECT',
                dmKey,
                members: { create: [{ userId }, { userId: otherId }] },
            },
        });
        await deps.bus.publish(userTopic(otherId), { type: 'room.added', roomId: room.id }).catch(() => {});
        return { room, created: true };
    } catch (err) {
        if (!isPrismaError(err, 'P2002')) throw err;
        return { room: await deps.prisma.room.findUniqueOrThrow({ where: { dmKey } }), created: false };
    }
}

export async function listRooms(deps: ServiceDeps, userId: string) {
    const memberships = await deps.prisma.roomMember.findMany({
        where: { userId },
        include: {
            room: {
                include: {
                    _count: { select: { members: true } },
                    // For DMs this is the other person.
                    members: { where: { userId: { not: userId } }, take: 1, include: { user: { select: { id: true, username: true } } } },
                    messages: { orderBy: { seq: 'desc' }, take: 1 },
                },
            },
        },
    });
    return memberships
        .map((m) => ({
            id: m.room.id,
            kind: m.room.kind,
            name: m.room.kind === 'DIRECT' ? (m.room.members[0]?.user.username ?? null) : m.room.name,
            peer: m.room.kind === 'DIRECT' ? (m.room.members[0]?.user ?? null) : null,
            memberCount: m.room._count.members,
            lastSeq: m.room.lastSeq,
            lastReadSeq: m.lastReadSeq,
            unreadCount: Math.max(0, m.room.lastSeq - m.lastReadSeq),
            lastMessage: m.room.messages[0] ? toMessageDTO(m.room.messages[0]) : null,
        }))
        .sort((a, b) => (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''));
}

export async function getRoom(deps: ServiceDeps, userId: string, roomId: string) {
    await requireMember(deps, userId, roomId);
    const room = await deps.prisma.room.findUniqueOrThrow({
        where: { id: roomId },
        include: { members: { include: { user: { select: { id: true, username: true } } }, orderBy: { joinedAt: 'asc' } } },
    });
    const online = await onlineAmong(deps.redis, room.members.map((m) => m.userId));
    return {
        id: room.id,
        kind: room.kind,
        name: room.name,
        lastSeq: room.lastSeq,
        createdAt: room.createdAt,
        members: room.members.map((m) => ({
            userId: m.userId,
            username: m.user.username,
            role: m.role,
            lastReadSeq: m.lastReadSeq,
            online: online.has(m.userId),
        })),
    };
}

async function requireRole(deps: ServiceDeps, userId: string, roomId: string, roles: MemberRole[]) {
    const me = await deps.prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
        include: { room: { select: { kind: true } } },
    });
    if (!me) throw forbidden('Not a member of this room');
    if (me.room.kind === 'DIRECT') throw badRequest('Direct rooms have a fixed membership');
    if (!roles.includes(me.role)) throw forbidden('Insufficient role');
    return me;
}

export async function addMember(deps: ServiceDeps, actorId: string, roomId: string, userId: string) {
    await requireRole(deps, actorId, roomId, ['OWNER', 'ADMIN']);
    if (!(await deps.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) {
        throw notFound('User not found');
    }
    try {
        await deps.prisma.roomMember.create({ data: { roomId, userId } });
    } catch (err) {
        if (isPrismaError(err, 'P2002')) throw conflict('Already a member');
        throw err;
    }
    await deps.bus.publish(userTopic(userId), { type: 'room.added', roomId }).catch(() => {});
}

// Self-leave, or an admin/owner removing someone. If the owner leaves, the
// longest-standing member inherits the room; an empty room is deleted.
export async function removeMember(deps: ServiceDeps, actorId: string, roomId: string, targetId: string) {
    const actor = await requireRole(deps, actorId, roomId, ['OWNER', 'ADMIN', 'MEMBER']);
    const target = actorId === targetId
        ? actor
        : await deps.prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId: targetId } } });
    if (!target) throw notFound('Not a member');

    if (actorId !== targetId) {
        const allowed = actor.role === 'OWNER' || (actor.role === 'ADMIN' && target.role === 'MEMBER');
        if (!allowed) throw forbidden('Insufficient role');
    }

    await deps.prisma.$transaction(async (tx) => {
        await tx.roomMember.delete({ where: { roomId_userId: { roomId, userId: targetId } } });
        if (target.role === 'OWNER') {
            const heir = await tx.roomMember.findFirst({ where: { roomId }, orderBy: { joinedAt: 'asc' } });
            if (heir) await tx.roomMember.update({ where: { roomId_userId: { roomId, userId: heir.userId } }, data: { role: 'OWNER' } });
            else await tx.room.delete({ where: { id: roomId } });
        }
    });

    // Push revocation: every instance holding this user's sockets drops the room.
    await invalidateMembership(deps.redis, roomId);
    await deps.bus.publish(userTopic(targetId), { type: 'room.removed', roomId }).catch(() => {});
}

export async function getHistory(deps: ServiceDeps, userId: string, roomId: string, beforeSeq: number | undefined, limit: number) {
    await requireMember(deps, userId, roomId);
    // Keyset pagination off the (roomId, seq) index: stable while new messages arrive.
    const rows = await deps.prisma.message.findMany({
        where: { roomId, ...(beforeSeq ? { seq: { lt: beforeSeq } } : {}) },
        orderBy: { seq: 'desc' },
        take: limit + 1,
    });
    const page = rows.slice(0, limit);
    return {
        messages: page.map(toMessageDTO),
        hasMore: rows.length > limit,
        nextBefore: page.length ? page[page.length - 1]!.seq : null,
    };
}

/** Read receipts only move forward, and never past the room's lastSeq. */
export async function markRead(deps: ServiceDeps, userId: string, roomId: string, seq: number) {
    await requireMember(deps, userId, roomId);
    const room = await deps.prisma.room.findUniqueOrThrow({ where: { id: roomId }, select: { lastSeq: true } });
    const target = Math.min(seq, room.lastSeq);
    const { count } = await deps.prisma.roomMember.updateMany({
        where: { roomId, userId, lastReadSeq: { lt: target } },
        data: { lastReadSeq: target },
    });
    if (count > 0) {
        await deps.bus.publish(roomTopic(roomId), { type: 'read.update', roomId, userId, seq: target })
            .catch((err) => console.error('[read] publish failed', err));
    }
    return { lastReadSeq: count > 0 ? target : undefined };
}
