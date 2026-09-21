import express from "express";
import { validateBody } from "../middleware/validateBody";
import { cityIdParamsSchema, createCitySchema, createTheatreSchema, theatreIdParamsSchema } from "../types";
import { createCityController, getCitiesController } from "../controller/cityController";
import { requireAdmin } from "../middleware/requireAdmin";
import { validateParams } from "../middleware/validateParams";

export const adminRouter = express.Router()

adminRouter.use(requireAdmin)

adminRouter.post(
    "/cities",
    validateBody(createCitySchema),
    createCityController
)
adminRouter.get(
    "/cities",
    getCitiesController
)
adminRouter.post(
    "/cities/:cityId/theatres",
    validateParams(cityIdParamsSchema),
    validateBody(createTheatreSchema),
    getCitiesController
)

adminRouter.get(
    "/theatres/:theatreId",
    validateParams(theatreIdParamsSchema),

)
adminRouter.post(
    "/theatres/:theatreId/screens",

)

adminRouter.post("/screns/:screenId/seats")

adminRouter.post("/movies")
adminRouter.get("/movies")

adminRouter.post("/showtimes")
adminRouter.delete("/showtimes/:showtimeId")