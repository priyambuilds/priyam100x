import { Elysia, t } from "elysia";
import { requireAuth } from "../../plugins/auth";
import { bookingSchema } from "./booking.schema";
import { createBookingService, getBookingsService } from "./booking.service";

export const bookingRoutes = new Elysia({ prefix: "/booking" })
    .use(requireAuth)
    .post("/showtimes/:showtimeId", async ({ params, body, userId, status }) => {
        const booking = await createBookingService(userId, params.showtimeId, body.seatNumbers)
        return status(200, {
            success: true,
            message: "Booking created successfully",
            data: booking
        })
    }, {
        params: t.Object({
            showtimeId: t.String({format: "uuid"})
        }),
        body: bookingSchema,
        detail: {
            summary: "Book seats for a show time",
            tags: ["Booking"]
        }
    })
    .get("/", async ({ userId, status }) => {
        const booking = await getBookingsService(userId);
        return status(200, {
            success: true,
            message: "Your bookings",
            data: booking
        })
    }, {
        detail: {
            summary: "Uer's booking history", tags: ["Booking"]
        }
    })