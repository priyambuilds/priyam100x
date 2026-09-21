import express from "express";
import { authRouter } from "./src/routes/userRouter";
import { showTimeRouter } from "./src/routes/showTimeRouter";
import { bookingRouter } from "./src/routes/bookingsRouter";
import { walletRouter } from "./src/routes/walletRouter";
import { transactionRouter } from "./src/routes/transactionRouter";
import { errorHandler } from "./src/middleware/errorHandler";
import { notFound } from "./src/middleware/notFound";
import { adminRouter } from "./src/routes/adminRouter";
import { catalogRouter } from "./src/routes/catalogRouter";

const port = Number(process.env.PORT)

const app = express();
app.use(express.json());

app.use("/ap/v4/auth", authRouter)
app.use("/api/v4/admin", adminRouter)
app.use("/api/v4/catalog", catalogRouter)
app.use("/api/v4/showtimes", showTimeRouter)
app.use("/api/v4/bookings", bookingRouter)
app.use("/api/v4/wallet", walletRouter)
app.use("/api/v4/trasactions", transactionRouter)

app.use(notFound)
app.use(errorHandler)

app.listen(port)