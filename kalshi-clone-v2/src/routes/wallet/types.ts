import { t } from "elysia";

export const onrampSchema = t.Object({
  amount: t.Integer({minimum: 100, maximum: 100_000_000})
})