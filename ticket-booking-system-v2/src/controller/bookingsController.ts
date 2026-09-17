import { BookingModel, ShowModel } from "../models/models.ts";
import { type Request, type Response } from "express";
import { bookingsSchema } from "../types/index.ts";

const bookShow = async (req: Request, res: Response) => {
  try {
    const parsedData = bookingsSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid inputs",
        errors: parsedData.error.issues,
      });
    }
    const userId = req.userId;
    const { showId, seats } = parsedData.data;

    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not an admin",
      });
    }

    const show = await ShowModel.findById(showId);

    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    if (show.availableTickets < seats) {
      return res.status(400).json({
        success: false,
        message: "Not enough tickets available",
      });
    }

    const totalAmount = show.ticketPrice * seats;

    show.availableTickets -= seats;
    await show.save();

    const bookedShow = await BookingModel.create({
      userId,
      showId,
      seats,
      totalAmount,
    });
    res.status(201).json({
      success: true,
      data: {
        bookingId: bookedShow._id,
        movieName: show.movieName,
        showTime: show.showTime,
        seats,
        totalAmount,
      },
      message: "Booking successful",
    });
    return;
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const showBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const bookings = await BookingModel.find({ userId }).populate(
      "showId",
      "movieName showTime ticketPrice",
    );
    res.status(200).json({
      success: true,
      data: [{ bookings }],
      message: "User Booking details",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: [],
      message: "internal server error",
    });
  }
};

export { bookShow, showBookings };
