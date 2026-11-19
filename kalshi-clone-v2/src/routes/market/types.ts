import { t } from "elysia";

export const createMarketSchema = t.Object({
  title: t.String({ minLength: 3, maxLength: 120 }),
  description: t.Optional(t.String({ maxLength: 2000 })),
  resolutionCriteria: t.String({minLength: 10, maxLength: 1000}),
  resolutionSource: t.String({ minLength: 3, maxLength: 1000 }),
  closesAt: t.String({format: "date-time"}),
});

export type CreateMarketInput = typeof createMarketSchema.static;

export const marketParamsSchema = t.Object({
  marketId: t.String({format: "uuid"})
})

export const splitSchema = t.Object({
  quantity: t.Integer({ minimum: 1, maximum: 10_000 }),
  requestId: t.String({minLength: 1, maxLength: 100})
})

export const mergeSchema = splitSchema;