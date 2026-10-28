import type { PrismaClient } from '../../../generated/prisma/client';
import { conflict, isPrismaError, unauthorized } from '../../errors';

// Compared against when the username doesn't exist, so "no such user" and
// "wrong password" cost the same time (no user enumeration by timing).
const DUMMY_HASH = await Bun.password.hash('dummy-password-for-timing');

export async function register(prisma: PrismaClient, username: string, password: string) {
    const passwordHash = await Bun.password.hash(password); // argon2id by default
    try {
        const user = await prisma.user.create({ data: { username, passwordHash }, select: { id: true, username: true } });
        return user;
    } catch (err) {
        if (isPrismaError(err, 'P2002')) throw conflict('Username already taken');
        throw err;
    }
}

export async function verifyLogin(prisma: PrismaClient, username: string, password: string) {
    const user = await prisma.user.findUnique({ where: { username } });
    const ok = await Bun.password.verify(password, user?.passwordHash ?? DUMMY_HASH).catch(() => false);
    if (!user || !ok) throw unauthorized('Invalid username or password');
    return { id: user.id, username: user.username };
}
