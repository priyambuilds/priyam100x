import express from "express";
import { userRouter } from "./routes/userRoutes.ts";
import showRouter from "./routes/showRoutes.ts";
import { bookingsRouter } from "./routes/bookingsRoutes.ts";
const app = express();
app.use(express.json());

// POST ENDPOINTS
app.use("/api/v1/auth/", userRouter); //POST localhost:3000/api/v1/auth/signup
app.use("/api/v1/shows/", showRouter);
app.use("/api/v1/bookings/", bookingsRouter);

app.listen(3000);
