import {Elysia} from "elysia"
import { getCitiesService } from "./catlog.service"

export const catlogRoutes = new Elysia({ prefix: "/catlog" })
    .get("/cities", async () => {
        const cities = await getCitiesService()
        return {success: true, data: cities}
    }, {
        detail: {summary: "List all cities", tags: ["Catlog"]}
    })