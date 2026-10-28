import { createPrisma } from "./src/lib/prisma";

const prisma = createPrisma(process.env.DATABASE_URL!);

// Demo data: alice + bob (password "password123"), a group room, and a DM.
async function main() {
    const passwordHash = await Bun.password.hash("password123");
    const [alice, bob] = await Promise.all(["alice", "bob"].map((username) =>
        prisma.user.upsert({ where: { username }, update: {}, create: { username, passwordHash } })));

    const room = await prisma.room.create({
        data: {
            kind: "GROUP", name: "General Chat",
            members: { create: [{ userId: alice!.id, role: "OWNER" }, { userId: bob!.id }] },
        },
    });
    console.log(`✅ Seeded. alice / bob, password "password123". Room: ${room.id}`);
}

main()
    .catch((e) => { console.error("Seed failed:", e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
