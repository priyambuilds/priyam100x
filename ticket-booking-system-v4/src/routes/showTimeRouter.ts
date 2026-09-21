import express from "express";
import { validateParams } from "../middleware/validateParams";
import { showtimeIdParamsSchema } from "../types";
import { getShowTimeByIdController, getShowTimeSeatsController } from "../controller/showTimeController";

export const showTimeRouter = express.Router()

showTimeRouter.get("/:showtimeId", validateParams(showtimeIdParamsSchema), getShowTimeByIdController) // Returns details of a selected showtime
showTimeRouter.get("/:showtimeId/seats", validateParams(showtimeIdParamsSchema), getShowTimeSeatsController) // Get available seats