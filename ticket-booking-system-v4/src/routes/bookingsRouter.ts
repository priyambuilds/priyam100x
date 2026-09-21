import express from "express";
import { cancelBookingController, createBookingController, getMyBookingsController } from "../controller/bookingController";
import { authMiddleWare } from "../middleware/auth";
import { validateBody } from "../middleware/validateBody";
import { bookingIdParamsSchema, createBookingSchema } from "../types";
import { validateParams } from "../middleware/validateParams";

export const bookingRouter = express.Router()
bookingRouter.post("/", authMiddleWare, validateBody(createBookingSchema), createBookingController)
bookingRouter.get("/", authMiddleWare, getMyBookingsController)
bookingRouter.post("/:bookingId/cancel", authMiddleWare, validateParams(bookingIdParamsSchema), cancelBookingController)