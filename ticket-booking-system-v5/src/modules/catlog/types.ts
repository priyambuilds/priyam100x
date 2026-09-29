import { t } from "elysia";

export const cityIdParams = t.Object({
  cityId: t.String({ format: "uuid" }),
});
export const theatreIdParams = t.Object({
  theatreId: t.String({ format: "uuid" }),
});
export const screenIdParams = t.Object({
  screenId: t.String({ format: "uuid" }),
});
export const showtimeIdParams = t.Object({
  showtimeId: t.String({ format: "uuid" }),
});

export const CityListSchema = t.Array(t.Object({
    id: t.String(),
    name: t.String()
}));

export const TheatreListSchema = t.Array(t.Object({
    id: t.String(),
    name: t.String(),
    cityId: t.String()
}));

export const ShowtimeListSchema = t.Array(t.Object({
    id: t.String(),
    screenId: t.String(),
    movieId: t.String(),
    startsAt: t.Any(),
    endsAt: t.Any(),
    priceCents: t.Integer(),
    createdAt: t.Any()
}));

export const ShowtimeDetailsSchema = t.Any();