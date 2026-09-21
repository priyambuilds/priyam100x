import type { NextFunction, Request, Response } from "express";
import { createMovieService, getMoviesByIdService, getMoviesService } from "./service/movieService";

export async function createMovieController(req: Request, res: Response, next: NextFunction) {
    try {
        const movies = await createMovieService(req.body.title, req.body.description, req.body.durationMin)
        return res.status(200).json({
            success: true,
            message: "movie created successfully",
            data: [{ movies }]
        })
    } catch (e) {
        next(e)
    }
}
export async function getMoviesController(req: Request, res: Response, next: NextFunction) {
    try {
        const movies = await getMoviesService();
        return res.status(200).json({
            success: true,
            data: [{movies}],
        });
    } catch (error) {
        next(error);
    }
}
export async function getMovieByIdController(req: Request, res: Response, next: NextFunction) {
    try {
        const movie = await getMoviesByIdService(req.params.movieId as string);
        return res.status(200).json({
            success: true,
            data: [{movie}],
        });
    } catch (e) {
        next(e)
    }
}