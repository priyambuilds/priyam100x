import { t } from "elysia";

export const TransactionListSchema = t.Array(t.Object({
    id: t.String(),
    bookingId: t.Union([t.String(), t.Null()]),
    userId: t.String(),
    type: t.String(),
    amountCents: t.Integer(),
    amountBeforeCents: t.Integer(),
    amountAfterCents: t.Integer(),
    status: t.String(),
    createdAt: t.Any(),
    updatedAt: t.Any()
}))