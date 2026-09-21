import * as z from "zod";

export const showtimeIdParamsSchema = z.object({
    showtimeId: z.uuid()
})
export const showtimParamsSchema = z.object({
    theatreId: z.uuid(),
    movieId: z.uuid()
})
export const showtimeQuerySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
})
export const showtimeSeatsParamsSchema = z.object({
    showtimeId: z.uuid()
})
export const cityIdParamsSchema = z.object({
    cityId: z.uuid()
})
export const cityTheatreParamsSchema = z.object({
    cityId: z.uuid()
})
export const theatreIdParamsSchema = z.object({
    theatreId: z.uuid()
})
export const theatreScreenParamsSchema = z.object({
  theatreId: z.uuid(),
});
export const screenIdParamsSchema = z.object({
  screenId: z.uuid(),
});
export const movieIdParamsSchema = z.object({
    movieId: z.uuid()
})
export const bookingIdParamsSchema = z.object({
    bookingId: z.uuid()
})

export const signupSchema = z.object({
    username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "username can only contain letters, numbers and underscores"),
    email: z.email(),
    password: z.string().min(8, "Password must contain atleast 8 chars").max(100, "The passsword should be below a 100 chars")
})

export const signInSchema = z.object({
    email: z.email(),
    password: z.string().min(8).max(100)
})

export const createCitySchema = z.object({
    name: z.string().trim().min(3).max(20)
})

export const createTheatreSchema = z.object({
    name: z.string().trim().min(3).max(20)
})

export const createScreenSchema = z.object({
  name: z.string().trim().min(3).max(20),
});

export const createSeatSchema = z.object({
    number: z.number().int().positive()
})

export const createSeatsSchema = z.object({
    seats: z.array(createSeatSchema).min(1).max(500)
})

export const createMovieSchema = z.object({
    title: z.string().trim().min(1).max(30),
    description: z.string().trim().max(200),
    durationMin: z.number().int().min(1).max(600)
})

export const createShowTimeSchema = z.object({
    movieId: z.uuid(),
    screenId: z.uuid(),

    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),

    priceCents: z.number().int().nonnegative(),
}).refine((data) => data.endsAt > data.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"]
})

export const createBookingSchema = z.object({
    showtimeId: z.uuid(),

    seatNumbers: z
        .array(z.number().int().positive())
        .min(1, "Select atleast one seat")
        .max(20, "You cannot book more than 20 seats")
        .superRefine((seatNumber, context) => {
            if (new Set(seatNumber).size !== seatNumber.length) {
                context.addIssue({
                    code: "custom",
                    message: "Duplicate seat numbers are not allowed"
            })
        }
    })
})

export const walletTopUpSchema = z.object({
    amountCents: z.number().int().min(1).max(1_000_000)
})