import { t } from "elysia";

export const placeOrderSchema = t.Object({
  marketId: t.String({ format: "uuid" }),
  side: t.Union([t.Literal("BUY"), t.Literal("SELL")]),
  outcome: t.Union([t.Literal("YES"), t.Literal("NO")]),
  limitPriceCents: t.Integer({minimum: 1, maximum:99}),
  quantity: t.Integer({minimum: 1, maximum:10_000}),
  requestId: t.String({minLength: 1, maxLength: 100}),
})

export type PlaceOrderInput = typeof placeOrderSchema.static;