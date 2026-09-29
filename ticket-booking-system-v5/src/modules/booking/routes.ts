import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth";
import { BookingListSchema, BookingResponseSchema, bookingSchema, showTimeIdParams } from "./types";
import { createBookingService, getBookingsService } from "./service";
import { res } from "../../lib/response";

export const bookingRoutes = new Elysia({ prefix: "/booking" })
    .use(authPlugin)
    .post("/showtimes/:showtimeId", async ({ body, params, userId, status }) => {
        const booking = await createBookingService(userId, params.showTimeId, body.seatNumbers)
        return status(201, {
            success: true,
            message: "Booking confirmed",
            data:booking
        })
    }, {
        body: bookingSchema,
        params: showTimeIdParams,
        response: { 201: res(BookingResponseSchema) },
        detail: { summary: "Create a booking", tags: ["Booking"] }
    })
    .get("/", async ({ userId, status }) => {
        const bookings = await getBookingsService(userId);
        return status(201, {
            success: true,
            message: "Below are all your bookings",
            data: bookings
        });
    }, {
        response: { 201: res(BookingListSchema) },
        detail:
        {
            summary:"Get all user bookings",
            tags: ["Booking"]
        }
    });