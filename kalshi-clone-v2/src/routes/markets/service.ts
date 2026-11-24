import { eq } from "drizzle-orm"
import { db } from "../../db/client"
import { cashAccounts, contractAccounts, markets, users } from "../../db/schema"
import { CreateMarketInput } from "./types"
import { BadRequestError } from "../../lib/errors"

export const createMarketService = async (creatorId: string, input: CreateMarketInput) => {
  const closesAt = new Date(input.closesAt)

  return db.transaction(async (tx) => {
    const [creator] = await tx.select({ role: users.role }).from(users).where(eq(users.id, creatorId)).for("share")

    if (!Number.isFinite(closesAt.getTime()) || closesAt.getTime() <= Date.now()) {
      throw new BadRequestError("Closing time must be in the future")
    }

    const [market] = await tx
      .insert(markets)
      .values({
        creatorId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        resolutionCriteria: input.resolutionCriteria.trim(),
        closesAt,
      })
      .returning()

    await tx.insert(cashAccounts).values({
      kind: "MARKET_ESCROW",
      marketId: market.id,
    })

    await tx.insert(contractAccounts).values([
      { kind: "ISSUER", marketId: market.id, outcome: "YES" },
      { kind: "ISSUER", marketId: market.id, outcome: "NO" },
    ])

    return market;
  })
}
