import { prisma } from "../../lib/prisma"
import { PlaceOrderInput } from "./types"
import type { Market, Position, Wallet } from "../../../generated/prisma/client"
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors"

export async function placeOrderService(userId: string, input: PlaceOrderInput) {
  const { marketId, side, outcome, limitPriceCents, quantity, requestId } = input

  return prisma.$transaction(
    async (tx) => {
      // Pick is a TypeScript utility. Read it as “take the status and closesAt fields from the Market type.”
      // The | lists the two field names we’re picking.
      // The [] at the end means the query returns an array of those rows.

      // If you wrote Market[] while selecting only two columns,
      // TypeScript would let you access market.escrowCents, even though the query never returned it.
      const [market] = await tx.$queryRaw<
        Pick<Market, "status" | "closesAt">[]
      >`SELECT "status", "closesAt" FROM "Market" WHERE "id" = ${marketId} FOR NO KEY UPDATE`

      if (!market) {
        throw new NotFoundError("Market not found")
      }

      const existing = await tx.order.findUnique({
        where: {
          userId_marketId_requestId: { userId, marketId, requestId },
        },
      })

      if (existing) {
        if (
          existing.side !== side ||
          existing.outcome !== outcome ||
          existing.limitPriceCents !== limitPriceCents ||
          existing.quantity !== quantity
        ) {
          throw new ConflictError("Request ID  was already used for a different order")
        }
        return {
          order: existing,
          replayed: true,
        }
      }
      if (market.status !== "OPEN" || market.closesAt.getTime() <= Date.now()) {
        throw new BadRequestError("Market is not open for trading")
      }
      if (side === "BUY") {
        const [wallet] = await tx.$queryRaw<
          Pick<Wallet, "id" | "balanceCents" | "lockedCents">[]
        >`SELECT "id", "balanceCents", "lockedCents" FROM "Wallet" WHERE "userId" = ${userId} FOR NO KEY UPDATE`

        if (!wallet) {
          throw new NotFoundError("Wallet not found")
        }
        // Reserve the required money for the order
        const reserveCents = limitPriceCents * quantity

        if (wallet.balanceCents - wallet.lockedCents < reserveCents) {
          throw new BadRequestError("Insufficient available cash")
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { lockedCents: { increment: reserveCents } },
        })
      } else {
        const [position] = await tx.$queryRaw<
          Pick<Position, "id" | "quantity" | "lockedQuantity">[]
        >`SELECT "id", "quantity", "lockedQuantity" FROM "Position" WHERE "userId" = ${userId} AND "marketId" = ${marketId} AND "outcome" = ${outcome}::"Outcome" FOR NO KEY UPDATE`

        if (!position || position.quantity - position.lockedQuantity < quantity) {
          throw new BadRequestError(`Insufficient available ${outcome} contracts`)
        }

        await tx.position.update({
          where: { id: position.id },
          data: { lockedQuantity: { increment: quantity } },
        })
      }

      // The asset lock may have taken time to acquire
      if (market.closesAt.getTime() <= Date.now()) {
        throw new BadRequestError("Market is not open for trading")
      }

      const order = await tx.order.create({
        data: {
          userId,
          marketId,
          side,
          outcome,
          limitPriceCents,
          quantity,
          remainingQuantity: quantity,
          requestId,
        },
      })
      return {
        order,
        replayed: false,
      }
    },
    { isolationLevel: "ReadCommitted" },
  )
}
