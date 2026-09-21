import express from "express";
import { validateBody } from "../middleware/validateBody";
import { cityIdParamsSchema, createCitySchema, createTheatreSchema, screenIdParamsSchema, theatreIdParamsSchema } from "../types";
import { createCityController } from "../controller/cityController";
import { requireAdmin } from "../middleware/requireAdmin";
import { validateParams } from "../middleware/validateParams";
import { authMiddleWare } from "../middleware/auth";
import { createTheatreController, getTheatreByIdController } from "../controller/theatreController";
import { createScreenController, createSeatsController } from "../controller/screenController";
import { createMovieController, getMoviesController } from "../controller/movieController";
import { createShowTimeController } from "../controller/showTimeController";

export const adminRouter = express.Router()

adminRouter.use(authMiddleWare)
adminRouter.use(requireAdmin)

// POST ENDPOINTS
// Create cities
adminRouter.post(
    "/cities",
    validateBody(createCitySchema),
    createCityController
)

// Create Theatres inside the city
adminRouter.post(
    "/cities/:cityId/theatres",
    validateParams(cityIdParamsSchema),
    validateBody(createTheatreSchema),
    createTheatreController
)

// Create screens inside the theatre
adminRouter.post(
    "/theatres/:theatreId/screens",
    validateParams(theatreIdParamsSchema),
    createScreenController
)

// Create seats for a screen
adminRouter.post(
    "/screens/:screenId/seats",
    validateParams(screenIdParamsSchema),
    createSeatsController
)

// Create a movie
adminRouter.post("/movies", createMovieController)

// Schedule all movies on a screen
adminRouter.post("/showtimes", createShowTimeController)


// GET ENDPOINTS
// Get all theatres in a particular city
adminRouter.get(
    "/:cityId/theatres",
    validateParams(cityIdParamsSchema),
    getTheatreByIdController
)
// Get theatre details including it's screens
adminRouter.get(
    "/theatres/:theatreId",
    validateParams(theatreIdParamsSchema),
    getTheatreByIdController
)

// List all movies
adminRouter.get("/movies", getMoviesController)