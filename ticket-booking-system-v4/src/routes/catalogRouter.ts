import express from "express";
import { validateParams } from "../middleware/validateParams";
import { validateQuery } from "../middleware/validateQuery";
import { cityIdParamsSchema, movieIdParamsSchema, showtimeQuerySchema } from "../types";
import { getCitiesController } from "../controller/cityController";
import { getMovieDatesByCityController, getMoviesByCityController, getTheatresByMovieAndDateController } from "../controller/catalogController";
import { getShowTimeController } from "../controller/showTimeController";

export const catalogRouter = express.Router()

catalogRouter.get("/cities", getCitiesController) // Returns all cities

catalogRouter.get(
    "/cities/:cityId/movies",
    validateParams(cityIdParamsSchema),
    getMoviesByCityController

) // Returns all movies in that particular city

catalogRouter.get(
    "/cities/:cityId/movies/:movieId/dates",
    validateParams(cityIdParamsSchema),
    validateParams(movieIdParamsSchema),
    getMovieDatesByCityController
) // Returns the dates on which that specific movie is playing in that city

// api/v4/catalog/cities/:cityId/movies/:movieId/theatres?date=2026-09-21
catalogRouter.get("/cities/:cityId/movies/:movieId/theatres",
    validateParams(cityIdParamsSchema),
    validateParams(movieIdParamsSchema),
    validateQuery(showtimeQuerySchema),
    getTheatresByMovieAndDateController
) // Returns theatres for a specific movie on a particular date

// /api/v4/catalog/theatres/:theatreId/movies/:movieId/showtimes?date=2026-09-21
catalogRouter.get("/cities/:cityId/movies/:movieId/showtimes",
    validateParams(cityIdParamsSchema),
    validateParams(movieIdParamsSchema),
    validateQuery(showtimeQuerySchema),
    getShowTimeController
) // Returns the times the user can choose
