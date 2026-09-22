import {prisma} from "../../prisma/index.ts"

export async function topUpWalletService(userId: string, amountCents: number) {
    return prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.upsert({
            where: {
                userId
            },
            create: {
                userId,
                balanceCents: amountCents
            },
            update: {
                balanceCents: {
                    increment: amountCents
                }
            }
        })

        await tx.transaction.create({
            data: {
                userId,
                type: "TOP_UP",
                amountCents,
                balanceBeforeCents: wallet.balanceCents - amountCents,
                balanceAfterCents: wallet.balanceCents,
                status: "COMPLETED"
            }
        })
        return wallet
    })
}

export async function getWalletService(userId: string) {
    
}