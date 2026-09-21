import type { NextFunction, Request, Response } from "express";
import { createScreenService, createSeatsService, getScreensBytheatreIdService } from "./service/screenService";

export async function createScreenController(req: Request, res: Response, next: NextFunction) {
    try {
        const screen = await createScreenService(req.body.theatreId, req.body.name)
        res.status(200).json({
            success: true,
            messaage: "Created screen successfully",
            data: [{screen}]
        })
    } catch (e) {
        next(e)
    }
}
export async function getScreensByTheatreController(req: Request, res: Response, next: NextFunction) {
    try {
        const screens = await getScreensBytheatreIdService(req.body.theatreId)
    
        res.status(200).json({
            success: true,
            messaage: "Below are all screens of this theatre",
            data: [{screens}]
        })
    } catch (e) {
        next(e)
    }
}
export async function createSeatsController(req: Request, res: Response, next: NextFunction) {
    try {
        const seats = await createSeatsService(req.body.screenId, req.body.seats.map(
            (seat: {number :number}) => seat.number
        ))
        
        res.status(200).json({
            success: true,
            messaage: "Created screen successfully",
            data: [{seats}]
        })
    } catch (e) {
        next(e)
    }
}