import { prisma } from "../../lib/prisma";

export async function getTransactions(userId:string, role: string) {
    if (role === "ADMIN") {
        return prisma.transaction.findMany(({orderBy:{createdAt: "desc"}}));
    }

    return prisma.transaction.findMany({
        where: { userId },
        orderBy: {createdAt: "desc"}
    })
}