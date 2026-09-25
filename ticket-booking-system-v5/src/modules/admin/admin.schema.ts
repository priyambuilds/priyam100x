import { t } from "elysia";

export const createCitySchema = t.Object({
    name: t.String({minLength: 3, maxLength: 20})
})
export const createTheatreSchema = t.Object({
    cityId: t.String({ format: "uuid" }),
    name: t.String({minLength: 3, maxLength: 20})
})
export const createScreenSchema = t.Object({
    theatreId: t.String({ format: "uuid" }),
    number: t.Integer({minimum: 1})
})
export const createSeatSchema = t.Object({
    screenId: t.String({ format: "uuid" }),
    number: t.Integer({minimum: 1})
})
export const createMovieSchema = t.Object({
    name: t.String({minLength: 3, maxLength: 20})
})
export const createShowTimeSchema = t.Object({
    screenId: t.String({format: "uuid"}),
    movieId: t.String({ format: "uuid" }),
    startsAt: t.Date(),
    endsAt: t.Date(),
    priceCents: t.Integer({minimum: 0})
})
