import { TransactionStatus, TransactionType } from "../../../generated/prisma/enums";
import { ConflictError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";

export async function topUpWalletService(userId: string, amountCents: number, idempotencyKey?: string) {
    if (idempotencyKey) {
        const existingTx = await prisma.transaction.findUnique({
            where: {idempotencyKey}
        })

        if (existingTx) {
            if (existingTx.status === TransactionStatus.SUCCESS) {
                return prisma.user.findUniqueOrThrow({
                    where: {
                        id: userId
                    },
                    select: {
                        id: true,
                        walletBalanceCents: true
                    }
                })
            }
            throw new ConflictError("A transaction with this idempotency key already exists")
        }
    }

    return prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
            where: {
                id: userId
            },
            select: {
                walletBalanceCents: true
            }
        })
        const updatedBalanceCents = user.walletBalanceCents + amountCents
        const updatedUser = await tx.user.update({
            where: {
                id: userId,
            },
            data: {
                walletBalanceCents: updatedBalanceCents
            },
            select: {
                id: true,
                walletBalanceCents: true
            }
        })

        await tx.transaction.create({
            data: {
                userId,
                type: TransactionType.TOP_UP,
                amountCents,
                amountBeforeCents: user.walletBalanceCents,
                amountAfterCents: updatedBalanceCents,
                status: TransactionStatus.SUCCESS,
                idempotencyKey
            }
        })
        return updatedUser
    })
}

export async function getWalletBalanceService(userId: string) {
    return prisma.user.findUniqueOrThrow({
        where: {
            id: userId
        },
        select: {
            id: true,
            walletBalanceCents: true
        }
    })
}