import { NotFoundError } from "elysia"
import { LedgerType } from "../../../generated/prisma/enums"
import { getWallet, transfer } from "../../lib/ledger"
import { prisma } from "../../lib/prisma"

export async function onrampService(userId: string, amount: number) {
  return await prisma.$transaction(async (tx) => {
    // 1. find user's wallet or throw
    const wallet = await getWallet(tx, userId)

    // 2. Transfer money from external acc to user's wallet
    await transfer(tx, {
      fromAccountId: "external",
      toAccountId: wallet.id,
      amount,
      type: LedgerType.ONRAMP,
    })

    // 3. Query and return the updated balance
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        account: {
          select: {
            balance: true,
          },
        },
      },
    })
    if (!user) {
      throw new NotFoundError("User not found")
    }
    return {
      id: user.id,
      username: user.username,
      balance: user.account?.balance ?? 0,
    }
  })
}

export async function transactionService(userId: string) {
  // 1. get the user's wallet id
  const wallet = await prisma.account.findUnique({
    where: { userId },
  })
  if (!wallet) {
    throw new NotFoundError("Wallet not found")
  }

  // 2. Query all ledger rows where this wallet was either  the sender (from) or receiver (to)
  const transactions = await prisma.ledger.findMany({
    where: {
      OR: [{ fromAccountId: wallet.id }, { toAccountId: wallet.id }],
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      market: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  // 3. format
  return transactions.map((tx) => {
    const isIncoming = tx.toAccountId === wallet.id
    return {
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      direction: isIncoming ? "CREDIT" : "DEBIT",
      // if incoming +amount, if outgoing -amount
      netEffect: isIncoming ? tx.amount : -tx.amount,
      market: tx.market ? { id: tx.market.id, title: tx.market.title } : null,
      createdAt: tx.createdAt,
    }
  })
}
