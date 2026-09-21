import type { NextFunction, Request, Response } from "express";
import { createShowtimeService } from "./service/showTimeServices";

export async function createShowTimeController(req: Request, res: Response, next: NextFunction) {
    try {
        const showTime = await createShowtimeService(
            req.body.movieId,
            req.body.screenId,
            req.body.startsAt,
            req.body.endsAt,
            req.body.priceCents
        )

        return res.status(200).json({
            success: true,
            message: "Showtime created successfully",
            dat:[{showTime}]
        })
    } catch (e) {
        next(e)
    }
}
export async function getShowTimeController(req: Request, res: Response, next: NextFunction) {

}
export async function getShowTimeByIdController(req: Request, res: Response, next: NextFunction) {

}
export async function getShowTimeSeatsController(req: Request, res: Response, next: NextFunction) {

}
export async function deleteShowTimeSeatsController(req: Request, res: Response, next: NextFunction) {

}