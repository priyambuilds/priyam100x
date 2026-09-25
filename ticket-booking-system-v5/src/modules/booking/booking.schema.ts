import { t } from "elysia";

export const bookingSchema = t.Object({
    seatNumbers: t.Array(t.Integer(), {minItems: 1, maxItems: 20})
})