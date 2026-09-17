import { ShowModel } from "../models/models.ts";
import type { Request, Response } from "express";
import { showsSchema } from "../types/index.ts";

const createShows = async (req: Request, res: Response) => {
  const parsedData = showsSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid inputs",
      errors: parsedData.error.issues,
    });
  }

  if (req.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "You are not an admin",
    });
  }

  const { movieName, showTime, ticketPrice, availableTickets } =
    parsedData.data;

  const newShow = await ShowModel.create({
    movieName,
    showTime,
    ticketPrice,
    availableTickets,
  });

  res.status(201).json({
    success: true,
    message: "Show created successfully",
    data: {
      showId: newShow._id,
    },
  });
};

const showShows = async (req: Request, res: Response) => {
  try {
    const shows = await ShowModel.find({});
    res.status(200).json({
      success: true,
      data: {
        shows,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "internal server error",
    });
  }
};

const showShowsById = async (req: Request, res: Response) => {
  try {
    const showId = await ShowModel.findById(req.params.showId);
    if (!showId) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }
    res.status(200).json(showId);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "internal server error",
    });
  }
};

export { createShows, showShows, showShowsById };
