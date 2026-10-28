import type { PrismaClient } from "../../../generated/prisma/client";
import { isPrismaError } from "../../errors";

export const SYNC_PAGE_SIZE = 100;

export async function saveMessage(prisma: PrismaClient, params: {
    roomId: string;
    senderId: string;
    clientMsgId: string;
    body: string;
}) {
    const findExisting = () => prisma.message.findUnique({
        where: {
            senderId_clientMsgId: { senderId: params.senderId, clientMsgId: params.clientMsgId }
        }
    });

    // Fast path for a retry (lost ack): no transaction, no row lock on the room.
    const already = await findExisting();
    if (already) return already;

    try {
        // The seq bump and the insert commit or roll back together, so seq is
        // gapless. The room UPDATE row-locks, which serializes writers per room.
        return await prisma.$transaction(async (tx) => {
            const room = await tx.room.update({
                where: { id: params.roomId },
                data: { lastSeq: { increment: 1 } },
                select: { lastSeq: true },
            });
            return tx.message.create({ data: { ...params, seq: room.lastSeq } });
        });
    } catch (error) {
        // Two concurrent retries both passed the fast path; the loser lands here
        // after its transaction (including the seq bump) rolled back.
        if (isPrismaError(error, 'P2002')) {
            const existing = await findExisting();
            if (existing) return existing;
        }
        throw error;
    }
}

export async function syncMessages(prisma: PrismaClient, roomId: string, afterSeq: number) {
    // Fetch one extra row so hasMore is exact (a page of exactly 100 is not "more").
    const rows = await prisma.message.findMany({
        where: { roomId, seq: { gt: afterSeq } },
        orderBy: { seq: 'asc' },
        take: SYNC_PAGE_SIZE + 1
    })
    return { messages: rows.slice(0, SYNC_PAGE_SIZE), hasMore: rows.length > SYNC_PAGE_SIZE };
}
