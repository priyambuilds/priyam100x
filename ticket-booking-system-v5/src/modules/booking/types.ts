import { t } from "elysia";

export const showTimeIdParams = t.Object({
    showTimeId: t.String({format: "uuid"})
})

export const bookingSchema = t.Object({
    seatNumbers: t.Array(t.Integer(), {minItems: 1, maxItems: 20})
})

export const BookingResponseSchema = t.Object({
    booking: t.Object({
        id: t.String(),
        userId: t.String(),
        showtimeId: t.String(),
        status: t.String(),
        totalCents: t.Integer(),
        createdAt: t.Any()
    }),
    seats: t.Array(t.Integer())
});

export const BookingListSchema = t.Array(t.Any());