import { NotFoundError, t } from "elysia"
import { LedgerType, Outcome } from "../../../generated/prisma/enums"
import { BadRequestError } from "../../lib/errors"
import { getWallet, transfer } from "../../lib/ledger"
import { prisma } from "../../lib/prisma"

export const createMarketService = async (
  title: string,
  description: string | null | undefined,
  side: Outcome,
  initialWager: number,
  expiry: Date,
  creatorId: string,
) => {
  // guard:  expiry must be in the future
  if (expiry.getTime() <= Date.now()) {
    throw new BadRequestError("Market expiry must be in the future")
  }

  return await prisma.$transaction(async (tx) => {
    // 1. fetch the creator's wallet
    const creatorWallet = await getWallet(tx, creatorId)

    // 2. create the market
    const market = await tx.market.create({
      data: {
        title,
        description: description || null,
        side,
        initialWager,
        remainingCapacity: initialWager,
        exp: expiry,
        creatorId,
        escrow: {
          create: {
            balance: 0,
          },
        },
      },
      include: {
        escrow: true,
      },
    })
    if (!market.escrow) {
      throw new Error("failed to initialize escrow account for the market created")
    }

    await transfer(tx, {
      fromAccountId: creatorWallet.id,
      toAccountId: market.escrow.id,
      amount: initialWager,
      type: LedgerType.MARKET_CREATED,
      marketId: market.id,
    })

    return market
  })
}

export async function getMarketService() {
  return await prisma.market.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  })
}

export async function getMarketByIdService(marketId: string) {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  })
  if (!market) {
    throw new NotFoundError("Market not found")
  }
  return market
}

export async function placeBetService(userId: string, amount: number, marketId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. fetch market with its escrow
    const market = await prisma.market.findUnique({
      where: {
        id: marketId,
      },
      include: {
        escrow: true,
      },
    })
    if (!market || !market.escrow) {
      throw new NotFoundError("Market or escrow now found")
    }
    // check 1. is the market already resolved?
    if (market.resolution !== null) {
      throw new BadRequestError("Market has already been resolved")
    }
    // check 2. has the market expired?
    if (market.exp.getTime() <= Date.now()) {
      throw new BadRequestError("Market has expired")
    }
    // check 3. creator cannot bet against their own market
    if (userId === market.creatorId) {
      throw new BadRequestError("Creator cannot bet against their own market")
    }
    // 2. Decrement the remaining capacity
    // If two users try to bet ₹30 when only ₹30 of capacity remains at the exact same millisecond:
    // - In MongoDB or a naive read-then-write approach, both could read capacity = 30,
    //  approve the bet, and total bets would hit ₹60 (breaking the invariant).

    // - In Postgres with updateMany ... WHERE remainingCapacity >= amount, Postgres 
    // executes the row update with a row-level lock. The first transaction succeeds 
    // (count = 1), and the second gets count = 0 and is cleanly rejected with "Bet 
    // exceeds remaining available capacity".
    const updated = await tx.market.updateMany({
      where: {
        id: marketId,
        remainingCapacity: { gte: amount },
        resolution: null,
      },
      data: {
        remainingCapacity: { decrement: amount },
      },
    })
    if (updated.count === 0) {
      throw new BadRequestError("Bet exceeds remaining available capacity of the market")
    }

    // transfer bet money from user to market escrow
    const userWallet = await getWallet(tx, userId)

    // create bet
    const bet = await prisma.bet.create({
      data: {
        userId,
        marketId,
        amount,
      },
    })

    transfer(tx, {
      fromAccountId: userWallet.id,
      toAccountId: market.escrow.id,
      amount,
      type: LedgerType.BET,
      marketId,
      betId: bet.id,
    })

    return {
      betId: bet.id,
      marketId: market.id,
      amount: bet.amount,
    }
  })
}

export async function getUserBetsService(userId: string) {
  const bet = await prisma.bet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      market: {
        select: {
          id: true,
          title: true,
          side: true,
          resolution: true,
          exp: true,
        },
      },
    },
  })
  return bet;
}
