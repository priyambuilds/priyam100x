import type { NextFunction, Request, Response } from "express";
import { createTheatreService, getTheatreByIdService, getTheatreService } from "./service/theatreService";

export async function createTheatreController(req: Request, res: Response, next: NextFunction) {
    try {
        const theatre = await createTheatreService(req.params.cityId as string, req.body.name)
        return res.status(200).json({
            success: true,
            message: "Theatre created successfully",
            data: [{theatre}]
        })
    } catch (e) {
        next(e)
    }
}

export async function getTheatreController(req: Request, res: Response, next: NextFunction) {
    try {
        const theatre = await getTheatreService(req.params.cityId as string)
        if (!theatre) {
            return res.status(404).json({
                success: false,
                message: "No theatres exist yet for this city",
                data: []
            });
        }
        return res.status(200).json({
            success: true,
            data: [{ theatre }],
        });
    } catch (e) {
        next(e)
    }
}

export async function getTheatreByIdController(req: Request, res: Response, next: NextFunction) {
    try {
        const theatre = await getTheatreByIdService(req.params.theatreId as string)
        if (!theatre) {
            return res.status(404).json({
                success: false,
                message: "Theatre not found",
                data: []
            });
        }
        return res.status(200).json({
            success: true,
            data: [{ theatre }],
        });
    } catch (e) {
        next(e)
    }
}