import { Elysia } from "elysia";
import { requireAdmin } from '../../plugins/auth';
import { createCitySchema, createMovieSchema, createScreenSchema, createSeatSchema, createShowTimeSchema, createTheatreSchema } from "./admin.schema";
import { createCitiesService, createMoviesService, createScreensService, createSeatsService, createShowTimeService, createTheatresService } from "./admin.service";

export const adminRoutes = new Elysia({ prefix: "/admin" })
    .use(requireAdmin)
    .post("/city", async ({ body, status }) => {
        const city = await createCitiesService(body.name)
        return status(200, {
            success: true,
            message: "City created successfully",
            data: city
        })
    }, {
        body: createCitySchema,
        detail: {
            summary: "Create a new city",
            tags: ["City"]
        }
    })
    .post("/city/:cityId/theatre", async ({ body, status }) => {
        const theatre = await createTheatresService(body.cityId, body.name)
        return status(200, {
            success: true,
            message: "Theatre created successfully",
            data: theatre
        })
    }, {
        body: createTheatreSchema,
        detail: {
            summary: "Create a theatre inside city",
            tags: ["Theatre"]
        }
    })
    .post("/theatre/:theatreId/screen", async ({ body, status }) => {
        const screen = await createScreensService(body.theatreId, body.number)
        return status(200, {
            success: true,
            message: "Screen created successfully",
            data: screen
        })
    }, {
        body: createScreenSchema,
        detail: {
            summary: "Create a screen inside a theatre",
            tags: ["Screen"]
        }
    })
    .post("/screen/:screenId/seats", async ({ body, status }) => {
        const seats = await createSeatsService(body.screenId, body.number)
        return status(200, {
            success: true,
            message: "Seats created successfully",
            data: seats
        })
    }, {
        body: createSeatSchema,
        detail: {
            summary: "Create seats inside the screen",
            tags: ["Seats"]
        }
    })
    .post("/movie", async ({ body, status }) => {
        const movie = await createMoviesService(body.name)
        return status(200, {
            success: true,
            message: "Movie created successfully",
            data: movie
        })
    }, {
        body: createMovieSchema,
        detail: {
            summary: "Create a movie",
            tags: ["Movie"]
        }
    })
    .post("/showTime", async ({ body, status }) => {
        const showTime = await createShowTimeService(body.screenId, body.movieId, body.startsAt, body.endsAt, body.priceCents)
        return status(200, {
            success: true,
            message: "Show time created successfully",
            data: showTime
        })
    }, {
        body: createShowTimeSchema,
        detail: {
            summary: "Create a show",
            tags: ["ShowTime"]
        }
    })