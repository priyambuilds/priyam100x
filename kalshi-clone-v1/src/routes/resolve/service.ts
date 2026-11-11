import { NotFoundError } from "elysia"
import { LedgerType, Outcome } from "../../../generated/prisma/enums"
import { prisma } from "../../lib/prisma"
import { BadRequestError } from "../../lib/errors"
import { getWallet, transfer } from "../../lib/ledger"

export const resolveService = async (marketId: string, userId: string, resolution: Outcome) => {
  return await prisma.$transaction(async (tx) => {
    // 1. fetch the market along with its escrow account and all placed bets
    const market = await tx.market.findUnique({
      where: { id: marketId },
      include: {
        escrow: true,
        bets: true,
      },
    })

    if (!market || !market.escrow) {
      throw new NotFoundError("Market or its escrow account not found")
    }

    // guard 1: only the creator can resolve
    if (market.creatorId !== userId) {
      throw new BadRequestError("Only the creator can resolve")
    }
    // guard 2: cannot resolve an already resolved market
    if (market.resolution !== null) {
      throw new BadRequestError("Cannot resolve a already resolved market")
    }

    const creatorWon = market.side === resolution
    // case 1: creator won
    // payout = all funds in the market's escrow acc
    if (creatorWon) {
      const creeatorPayout = market.escrow.balance

      if (creeatorPayout > 0) {
        const creatorWallet = await getWallet(tx, market.creatorId)

        await transfer(tx, {
          fromAccountId: market.escrow.id,
          toAccountId: creatorWallet.id,
          amount: creeatorPayout,
          type: LedgerType.PAYOUT,
          marketId: market.id,
        })
      }
    } else {
      // case 2: Creator looses

      // 1. pay 2x to each inidividual winning bettor
      for (const bet of market.bets) {
        const bettorPayout = bet.amount * 2;
        const bettorWallet = await getWallet(tx, bet.userId);
        
        await transfer(tx, {
          fromAccountId: market.escrow.id,
          toAccountId: bettorWallet.id,
          amount: bettorPayout,
          type: LedgerType.PAYOUT,
          marketId: market.id,
          betId: bet.id
        })
      }

      // 2. refund unmatched stake
      const unmatchedStake = market.remainingCapacity;
      if (unmatchedStake > 0) {
        const creatorWallet = await getWallet(tx, market.creatorId);

        await transfer(tx, {
          fromAccountId: market.escrow.id,
          toAccountId: creatorWallet.id,
          amount: unmatchedStake,
          type: LedgerType.REFUND,
          marketId: market.id
        })
      }
    }

    // 3. Mark market as resolved
    const resolvedMarket = await tx.market.update({
      where: { id: marketId },
      data: {
        resolution,
        resolvedAt: new Date()
      },
      select: {
        id: true,
        title: true,
        side: true,
        resolution: true,
        resolvedAt: true
      }
    })

    return {
      marketId: resolvedMarket.id,
      title: resolvedMarket.title,
      side: resolvedMarket.side,
      resolution: resolvedMarket.resolution,
      resolvedAt: resolvedMarket.resolvedAt
    };
  })
}
