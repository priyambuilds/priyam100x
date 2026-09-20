import express from "express";
import { bookingController, getBookingController } from "../controller/bookingController";
import { authMiddleWare } from "../middleware/auth";

export const bookingRouter = express.Router()
bookingRouter.post("/", authMiddleWare, bookingController)
bookingRouter.get("/", authMiddleWare, getBookingController)