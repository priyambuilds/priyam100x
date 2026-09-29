import { t } from "elysia";

export const createCitySchema = t.Object({
    name: t.String({ minLength: 1 })
});
export const CityResponseSchema = t.Object({
    id: t.String(),
    name: t.String()
});

export const createTheatreSchema = t.Object({
    name: t.String({ minLength: 1 })
});
export const TheatreResponseSchema = t.Object({
    id: t.String(),
    name: t.String(),
    cityId: t.String()
});

export const createScreenSchema = t.Object({
    numbers: t.Array(t.Integer({minimum: 1}), {minItems: 1})
});
export const ScreenResponseSchema = t.Array(
    t.Object({
        id: t.String(),
        number: t.Integer(),
        theatreId: t.String(),
    }),
);

export const createSeatSchema = t.Object({
    numbers: t.Array(t.Integer({minimum: 1}), {minItems: 1})
});
export const SeatResponseSchema = t.Array(
    t.Object({
        id: t.String(),
        number: t.Integer(),
        screenId: t.String(),
    }),
);

export const createMovieSchema = t.Object({
    name: t.String({ minLength: 1 })
});
export const MovieResponseSchema = t.Object({
    id: t.String(),
    name: t.String()
});

export const createShowtimeSchema = t.Object({
    screenId: t.String({ format: "uuid" }),
    movieId: t.String({ format: "uuid" }),
    startsAt: t.String({ format: "date-time" }),
    endsAt: t.String({ format: "date-time" }),
    priceCents: t.Integer({ minimum: 0 })
});
export const ShowtimeResponseSchema = t.Object({
    id: t.String(),
    screenId: t.String(),
    movieId: t.String(),
    startsAt: t.Any(),
    endsAt: t.Any(),
    priceCents: t.Integer(),
    createdAt: t.Any()
});


// Params schemas
export const cityIdParams = t.Object({ cityId: t.String({ format: "uuid" }) });
export const theatreIdParams = t.Object({ theatreId: t.String({ format: "uuid" }) });
export const screenIdParams = t.Object({ screenId: t.String({ format: "uuid" }) });