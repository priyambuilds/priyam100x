import { Elysia, t } from "elysia"
import { res } from "../../lib/response"
import { getCitiesService, getTheatresByCityService, getShowtimesByTheatreService, getShowtimeService } from "./service"
import {
    CityListSchema,
    TheatreListSchema,
    ShowtimeListSchema,
    ShowtimeDetailsSchema,
    cityIdParams,
    theatreIdParams,
    showtimeIdParams,
} from "./types"

export const catlogRoutes = new Elysia({ prefix: "/catalog" })
    .get(
        "/cities",
        async () => {
            const cities = await getCitiesService()
            return { success: true as const, data: cities }
        },
        {
            response: { 200: res(CityListSchema) },
            detail: { summary: "List all cities", tags: ["Catalog"] },
        },
    )
    .get(
        "/cities/:cityId/theatres",
        async ({ params }) => {
            const theatres = await getTheatresByCityService(params.cityId)
            return { success: true as const, data: theatres }
        },
        {
            params: cityIdParams,
            response: { 200: res(TheatreListSchema) },
            detail: { summary: "List theatres in a city", tags: ["Catalog"] },
        },
    )
    .get(
        "/theatres/:theatreId/showtimes",
        async ({ params }) => {
            const showtimes = await getShowtimesByTheatreService(params.theatreId)
            return { success: true as const, data: showtimes }
        },
        {
            params: theatreIdParams,
            response: { 200: res(ShowtimeListSchema) },
            detail: { summary: "List showtimes in a theatre", tags: ["Catalog"] },
        },
    )
    .get(
        "/showtimes/:showtimeId",
        async ({ params }) => {
            const showtime = await getShowtimeService(params.showtimeId)
            return { success: true as const, data: showtime }
        },
        {
            params: showtimeIdParams,
            response: { 200: res(ShowtimeDetailsSchema) },
            detail: { summary: "Get showtime details", tags: ["Catalog"] },
        },
    )
