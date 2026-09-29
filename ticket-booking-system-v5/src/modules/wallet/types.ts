import { t } from "elysia";

export const topupSchema = t.Object({
  amountCents: t.Integer({ minimum: 100 }),
  idempotencyKey: t.Optional(t.String({format: "uuid"}))
});

export const WalletResponseSchema = t.Object({
  id: t.String(),
  walletBalanceCents: t.Number(),
});
