import express from "express";
import { authRouter } from "./src/routes/userRouter";
import { showRouter } from "./src/routes/showRouter";
import { bookingRouter } from "./src/routes/bookingsRouter";
import { walletRouter } from "./src/routes/walletRouter";
import { transactionRouter } from "./src/routes/transactionRouter";

const port = Number(process.env.PORT)
const app = express();
app.use(express.json());

app.use("/ap/v1/auth", authRouter)
app.use("/ap/v1/shows", showRouter)
app.use("/ap/v1/booking", bookingRouter)
app.use("/ap/v1/wallet", walletRouter)
app.use("/ap/v1/transactions", transactionRouter)

app.listen(3000)