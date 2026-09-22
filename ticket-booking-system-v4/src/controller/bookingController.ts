import { type Request, type Response, type NextFunction } from 'express';
import { createBookingService, getMyBookingsService } from './service/bookingService';

export async function createBookingController (req:Request, res: Response, next: NextFunction ) {
    try {
        const booking = await createBookingService(
            req.userId,
            req.body.showtimeId,
            req.body.seatNumbers
        )
        return res.status(200).json({
            success: true,
            message: "booking created successfully",
            data: [{booking}]
        })
    } catch (e) {
        next(e)
    }
}

export async function getMyBookingsController (req: Request, res: Response, next: NextFunction) {
    try {
        const booking = await getMyBookingsService(req.userId)
        return res.status(200).json({
            success: true,
            message: "Below are your bookings",
            data: [{booking}]
        })
    } catch (e) {
        next(e)
    }
}
export const getBookingByIdController = (req: Request, res: Response, next: NextFunction) => {
    
}
export const cancelBookingController = (req: Request, res: Response, next: NextFunction) => {
    
}