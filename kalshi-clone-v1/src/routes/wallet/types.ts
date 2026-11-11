import { t } from "elysia";

export const onrampSchema = t.Object({
  amount: t.Integer({minimum: 1, maximum: 1_000_000})
})