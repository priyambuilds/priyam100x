import { t } from "elysia";

export const createMarketSchema = t.Object({
  title: t.String({ minLength: 3, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 10000 })),
  side: t.UnionEnum(["YES", "NO"]),
  initialWager: t.Integer({ minimum: 1, maximum: 1_000_000 }),
  expiry: t.Date()
})

export const placeBetSchema = t.Object({
  marketId: t.String({ format: "uuid" }),
  amount: t.Integer({minimum: 1, maximum: 1_000_000})
})