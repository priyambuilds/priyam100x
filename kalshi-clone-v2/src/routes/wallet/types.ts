import { t } from "elysia"

export const depositSchema = t.Object({
  amountCents: t.Integer({ minimum: 1, maximum: 1_000_000 }),
  requestId: t.String({
    minLength: 1,
    maxLength: 100,
  }),
})