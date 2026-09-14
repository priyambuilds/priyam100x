import express from "express";
import jwt from "jsonwebtoken";
import { UserModel, ShowModel, BookingModel } from "./models.js";
import { authMiddleWare } from "./middleware.js";

const app = express();
app.use(express.json());

// POST ENDPOINTS
app.post("/signup", async (req, res) => {
  const { username, email, password, role } = req.body;
  const userExists = await UserModel.findOne({
    username,
    email,
  });

  if (userExists) {
    return res.status(411).json({
      message: "User with this username or email already exists",
    });
  }

  const newUser = await UserModel.create({
    username,
    email,
    password,
    role,
  });

  res.status(201).json({
    id: newUser._id,
    message: "user added successfully",
  });
});

app.post("/signin", async (req, res) => {
  const { username, email, password } = req.body;

  const userExists = await UserModel.findOne({
    username,
    email,
    password,
  });
  console.log(userExists);

  if (!userExists) {
    res.status(411).json({
      message: "Incorrect credentials",
    });
    return;
  }

  const token = jwt.sign(
    {
      userId: userExists.id,
    },
    "ultrasupersecretpassword123",
  );

  res.json({
    token,
  });
});

app.post("/shows", authMiddleWare, async (req, res) => {
  const userId = req.userId;
  const isAdmin = await UserModel.findById(userId);

  const { movieName, showTime, ticketPrice, availableTickets } = req.body;

  if (
    !movieName ||
    !showTime ||
    ticketPrice === undefined ||
    availableTickets === undefined
  ) {
    return res.status(400).json({
      message:
        "movieName, showTime, ticketPrice and availableTickets are required",
    });
  }

  if (ticketPrice <= 0 || availableTickets <= 0) {
    return res.status(400).json({
      message: "ticketPrice and availableTickets must be greater than 0",
    });
  }

  if (!isAdmin || isAdmin.role !== "admin") {
    return res.status(411).json({
      message: "You are not an admin",
    });
  }

  const newShow = await ShowModel.create({
    moviename,
    showtime,
    ticketprice,
    availabletickets
  });

  res.status(201).json({
    message: "Show created successfully",
    showId: newShow._id,
  });
});

app.post("/bookings", authMiddleWare, async (req, res) => {
  try {
    const userId = req.userId;
    const { showId, seats } = req.body;

    if (!showId || !seats) {
      return res.status(404).json({
        message: "showId and seats are required",
      });
    } else if (seats <= 0) {
      return res.status(400).json({
        message: "Seats must be greater than 0",
      });
    }
    const isAdmin = await UserModel.findById(userId);
    if (isAdmin.role === "admin") {
      return res.status(403).json({
        message: "Admins cannot book tickets",
      });
    }
    const show = await ShowModel.findOne(req.body.showId);
    if (!showId) {
      return res.status(404).json({
        message: "Show not found",
      });
    } else if (!showId.availableTickets < seats) {
      return res.status(400).json({
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
      message: "Booking successful",
      bookingId: bookedShow._id,
      movieName: showId.movieName,
      showTime: showId.showTime,
      seats: tickets,
      totalAmount,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
// GET ENDPOINTS
app.get("/shows", async (req, res) => {
  try {
    const shows = await ShowModel.find({});
    res.status(200).json(shows);
  } catch (error) {
    res.status(500).json({
      message: "internal server error",
    });
  }
});

app.get("/shows/:showId", async (req, res) => {
  try {
    const showId = await ShowModel.findById(req.params.showId);
    if (!showId) {
      return res.status(404).json({
        message: "Show not found",
      });
    }
    res.status(200).json(showId);
  } catch (error) {
    res.status(500).json({
      message: "internal server error",
    });
  }
});

app.get("/bookings", authMiddleWare, async (req, res) => {
  try {
    const userId = req.userId;
    const bookings = await BookingModel.find({ userId }).populate(
      "showId",
      "movieName showTime ticketPrice",
    );
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({
      message: "internal server error",
    });
  }
});

app.listen(3000);