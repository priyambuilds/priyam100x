import { Prisma } from "../../generated/prisma/client"
import { AccountType, Outcome, TransferType } from "../../generated/prisma/enums"
import { BadRequestError, NotFoundError } from "../../../ticket-booking-system-v5/src/lib/errors"
// Native PostgreSQL Market Lock
// Using PostgreSQL's native transaction advisory lock
// Automatically releases when the transaction commits or aborts

export async function lockMarketForMatching(tx: Prisma.TransactionClient, marketId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${marketId}))`
}

// Multi asset transfer
export type TransferArgs = {
  fromAccountId: string
  toAccountId: string
  amount: number
  type: TransferType
  marketId?: string
  orderId?: string
  fillId?: string
}

// Executes an atomic double entry transaction between two accounts
// 1. Debits the sender account 
// 2. Credis the receiver account
// 3. Records an immutable transfer entry int the ledger

export async function transfer(tx: Prisma.TransactionClient, args: TransferArgs) {
  const { fromAccountId, toAccountId, amount, type, marketId, orderId, fillId } = args

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BadRequestError(`Transfer amount must be a postive integer, got ${amount}`)
  }

  if (fromAccountId === toAccountId) {
    throw new BadRequestError(`Cannot transfer to the same account`)
  }

  // 1. Debit the sender
  // the system's bank acc can go negative (it minds curreny/contracts)
  // All other accounts require available balance > 0
  const isClearingHouse = fromAccountId === "clearinghouse"

  const debited = await tx.account.updateMany({
    where: isClearingHouse ? { id: fromAccountId } : { id: fromAccountId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  })

  if (debited.count === 0) {
    throw new BadRequestError("Insufficient balance for transfer")
  }

  // 2. Credit the receiver
  const credited = await tx.account.updateMany({
    where: { id: toAccountId },
    data: { balance: { increment: amount } },
  })

  if (credited.count === 0) {
    throw new NotFoundError("Destination acc not found")
  }

  await tx.transfer.create({
    data: {
      fromAccountId,
      toAccountId,
      amount,
      type,
      marketId,
      orderId,
      fillId,
    },
  })
}

// Balance reservation (Order Margin Locking)

// Reserves funds or contracts for an open limit order
// Available balance to spend is: (balance - locked)
export async function locketAccountAssets(tx: Prisma.TransactionClient, accountId: string, amount: number) {
  // Ensure the account has enough locked assets: (balance - locked) >= amount
  const account = await tx.account.findUnique({
    where: { id: accountId },
  })

  if (!account || account.balance - account.locked < amount) {
    throw new BadRequestError("Insufficient available balacne to place order")
  }

  await tx.account.update({
    where: { id: accountId },
    data: { locked: { increment: amount } },
  })
}

// Unlocks assets when an open order is cancelled
export async function unlockAccountassets(tx: Prisma.TransactionClient, accountId: string, amount: number) {
  await tx.account.update({
    where: { id: accountId },
    data: { locked: { decrement: amount } },
  })
}

// When an order matches and executes, consumes the locked reserve
export async function consumeLockedAssets(tx: Prisma.TransactionClient, accountId: string, amount: number) {
  await tx.account.update({
    where: { id: accountId },
    data: { locked: { decrement: amount } },
  })
}

// Account Retrieval / Upsert helpers

// Finds or creates a user's wallet account
export async function getUserCashAccount(tx: Prisma.TransactionClient, userId: string) {
  let account = await tx.account.findFirst({
    where: {
      userId,
      type: AccountType.USER_WALLET,
    },
  })

  if (!account) {
    account = await tx.account.create({
      data: {
        userId,
        type: AccountType.USER_WALLET,
        balance: 0,
        locked: 0,
      },
    })
  }
  return account
}

// Finds or creates a user's position account for a specific market (YES or NO contracts)
export async function getUserPositionAccount(
  tx: Prisma.TransactionClient,
  userId: string,
  marketId: string,
  outcome: Outcome,
) {
  let account = await tx.account.findFirst({
    where: {
      userId,
      marketId,
      outcome,
      type: AccountType.USER_POSITION,
    },
  })

  if (!account) {
    account = await tx.account.create({
      data: {
        userId,
        marketId,
        outcome,
        type: AccountType.USER_POSITION,
        balance: 0,
        locked: 0,
      },
    })
  }
  return account
}

// Gets the dedicated cash esrow account for a market
export async function getMarketEscrowAccount(tx: Prisma.TransactionClient, marketId: string) {
  const account = await tx.account.findFirst({
    where: {
      marketId,
      type: AccountType.MARKET_ESCROW,
    },
  })

  if (!account) {
    throw new NotFoundError("Market escrow account not found")
  }
  return account
}
