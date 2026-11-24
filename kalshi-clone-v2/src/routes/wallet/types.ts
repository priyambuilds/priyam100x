import { t } from "elysia";

export const depositSchema = t.Object({
  amountCents: t.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
  requestId: t.String({minLength: 1, maxLength: 100})
})

export type DepositInput = typeof depositSchema.static;