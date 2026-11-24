import { t } from "elysia"

export const createMarketSchema = t.Object({
  title: t.String({ minLength: 1, maxLength: 200 }),
  description: t.String({ maxLength: 2000 }),
  resolutionCriteria: t.String({ minLength: 1, maxLength: 2000 }),
  closesAt: t.String({ format: "date-time" }),
})


export type CreateMarketInput = typeof createMarketSchema.static;