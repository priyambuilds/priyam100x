import { prisma } from "../../prisma/index.ts";

export async function getTransactionsService(userId: string) {
    return prisma.transaction.findMany({
        where: {
            userId
        },
        orderBy: {
            createdAt:  "desc"
        }
    })
}