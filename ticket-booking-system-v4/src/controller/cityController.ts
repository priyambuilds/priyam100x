import type { Request, Response, NextFunction } from "express";
import { createCityService, getCitiesService } from "./service/cityService.ts";

export async function createCityController(req: Request, res: Response, next: NextFunction) {
    try {
        const city = await createCityService(req.body.name)
        return res.status(200).json({
            success: true,
            message: "City created successfully",
            data: [{city}]
        })
    } catch (e) {
        next(e)
    }
}

export async function getCitiesController(req: Request, res: Response, next: NextFunction) {
    try {
        const city = await getCitiesService()
        return res.status(200).json({
            success: true,
            message: "Below are all the cities",
            data: [{city}]
        })
    } catch (e) {
        next(e)
    }
}