import express from "express";

export const catalogRouter = express.Router()

catalogRouter.get("/cities/:cityId/movies")
catalogRouter.get("/cities/:cityId/movies/:movieId/dates")
catalogRouter.get("/cities/:cityId/movies/:movieId/showtimes")

