import { LedgerType } from "../../generated/prisma/enums"
import type { Prisma } from "../../generated/prisma/client"
import { BadRequestError, NotFoundError } from "./errors"

export type TransferArgs = {
  fromAccountId: string
  toAccountId: string
  amount: number
  type: LedgerType
  marketId?: string
  betId?: string
  externalId?: string
}

// Why does transfer() take a tx (transaction client) and not use prisma directly?
// Because transfers must always happen inside a Prisma transaction. The caller does:

// await prisma.$transaction(async (tx) => {
//   await transfer(tx, { ... });
//   // maybe more work here
// });

// If ANY step inside the $transaction fails, everything rolls back. 
// The debit, the credit, and the ledger entry either ALL succeed or NONE do. 
// This prevents scenarios like "money left Alice's wallet but never arrived in escrow."

export async function transfer(tx: Prisma.TransactionClient, args: TransferArgs) {
  const { fromAccountId, toAccountId, amount, type, marketId, betId, externalId } = args

  // Account must be a +pve integer
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BadRequestError(`Transfer amount must be a positive integer, got ${amount}`)
  }

  // Cant send money to yourself
  if (fromAccountId === toAccountId) {
    throw new BadRequestError("Cannot transfer money to the same account")
  }

  // 1. debit the sender
  // The "external" bank can go negative (it mints money), so we skip the balance check.
  // For all other accounts, we only debit if balance >= amount (atomic guard).
  const isExtenal = fromAccountId === "external"

  const debited = await tx.account.updateMany({
    where: isExtenal ? { id: fromAccountId } : { id: fromAccountId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  })

  // if updateMany matched 0 rows, either the account doesnt exist or the balance was too low
  if (debited.count === 0) {
    throw new BadRequestError("Either the account doesnt exist or there's insfficient balance in the account")
  }

  // 2. Credit the receiver
  // Why updateMany instead of update for the debit?
  // where: { id: fromAccountId, balance: { gte: amount } }
  // This says: "Update this account, BUT ONLY IF its balance is >=
  // the amount." If the balance is too low, updateMany returns { count: 0 }
  // instead of throwing — and we handle that cleanly.

  // With update, you'd need to: (1) read the balance, (2) check if it's enough, 
  // (3) subtract. But between steps 1 and 3, another request could drain the 
  // balance — a race condition. The updateMany with WHERE balance >= amount is a 
  // single atomic SQL statement — the check and the update happen together, so no 
  // race condition is possible.
  const credited = await tx.account.updateMany({
    where: { id: toAccountId },
    data: {
      balance: {
        increment: amount,
      },
    },
  })

  if (credited.count === 0) {
    throw new NotFoundError("Destination account not found")
  }

  // 3. Record the ledger entry
  await tx.ledger.create({
    data: {
      fromAccountId,
      toAccountId,
      amount,
      type,
      marketId,
      betId,
      externalId,
    },
  })

  // Helper look up a user's wallet
}

export async function getWallet(tx: Prisma.TransactionClient, userId: string) {
  const wallet = await tx.account.findUnique({
    where: { userId },
  })
  if (!wallet) {
    throw new NotFoundError("Wallet not found")
  }
  return wallet
}
