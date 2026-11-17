import { t } from "elysia";

export const createMarketSchema = t.Object({
  title: t.String({ minLength: 3, maxLength: 120 }),
  description: t.Optional(t.String({ maxLength: 2000 })),
  expiry: t.Date()
})