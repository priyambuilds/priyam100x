import { Elysia } from "elysia"
import { requireAdmin } from "../../plugins/admin"
import {
    cityIdParams,
    CityResponseSchema,
    createCitySchema,
    createMovieSchema,
    createScreenSchema,
    createSeatSchema,
    createShowtimeSchema,
    createTheatreSchema,
    MovieResponseSchema,
    screenIdParams,
    ScreenResponseSchema,
    SeatResponseSchema,
    ShowtimeResponseSchema,
    theatreIdParams,
    TheatreResponseSchema,
} from "./types"
import {
    createCityService,
    createMovieService,
    createScreenService,
    createSeatService,
    createShowtimeService,
    createTheatreService,
} from "./service"
import {res} from "../../lib/response";

export const adminRoutes = new Elysia({ prefix: "/admin" })
    .use(requireAdmin)
    .post(
        "/city",
        async ({ body, status }) => {
            const city = await createCityService(body.name)
            return status(201, {
                success: true,
                message: "City created successfully",
                data: city,
            })
        },
        {
            body: createCitySchema,
            response: {201: res(CityResponseSchema)},
            detail: {
                summary: "Create a city",
                tags: ["Admin"],
            },
        },
    )
    .post(
        "/movie",
        async ({ body, set }) => {
            const movie = await createMovieService(body.name)
            set.status = 201
            return {
                success: true,
                message: "Theatre created successfully",
                data: movie,
            }
        },
        {
            body: createMovieSchema,
            response: {201: res(MovieResponseSchema)},
            detail: {
                summary: "Create movie",
                tags: ["Admin"],
            },
        },
    )
    .post(
        "/city/:cityId/theatre",
        async ({ params, body, status }) => {
            const theatre = await createTheatreService(params.cityId, body.name)
            return status(201, {
                success: true,
                message: "Created showtime successfully",
                data: theatre,
            })
        },
        {
            body: createTheatreSchema,
            response: {201: res(TheatreResponseSchema)},
            params: cityIdParams,
            detail: { summary: "Create theatre", tags: ["Admin"] },
        },
    )
    .post(
        "/theatre/:theatreId/screen",
        async ({ params, body, status }) => {
            const screen = await createScreenService(params.theatreId, body.numbers)
            return status(201, {
                success: true,
                message: "Created showtime successfully",
                data: screen,
            })
        },
        {
            body: createScreenSchema,
            response: {201: res(ScreenResponseSchema)},
            params: theatreIdParams,
            detail: { summary: "Create screen", tags: ["Admin"] },
        },
    )
    .post(
        "/screen/:screenId/seat",
        async ({ params, body, status }) => {
            const seat = await createSeatService(params.screenId, body.numbers)
            return status(201, {
                success: true,
                message: "Created showtime successfully",
                data: seat,
            })
        },
        {
            body: createSeatSchema,
            response: {201: res(SeatResponseSchema)},
            params: screenIdParams,
            detail: { summary: "Create seat", tags: ["Admin"] },
        },
    )
    .post(
        "/showtime",
        async ({ body, status }) => {
            const showTime = await createShowtimeService(
                body.screenId,
                body.movieId,
                new Date(body.startsAt),
                new Date(body.endsAt),
                body.priceCents,
            )
            return status(201, {
                success: true,
                message: "Created showtime successfully",
                data: showTime,
            })
        },
        {
            body: createShowtimeSchema,
            response: {201: res(ShowtimeResponseSchema)},
            detail: {
                summary: "Create showtime",
                tags: ["Admin"],
            },
        },
    )
