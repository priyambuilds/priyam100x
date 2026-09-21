import express from "express";
import { createBookingController, getMyBookingsController } from "../controller/bookingController";
import { authMiddleWare } from "../middleware/auth";

export const bookingRouter = express.Router()
bookingRouter.post("/", authMiddleWare, createBookingController)
bookingRouter.get("/", authMiddleWare, getMyBookingsController)