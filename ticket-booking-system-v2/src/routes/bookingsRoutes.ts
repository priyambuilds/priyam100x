import express, {type RequestHandler} from "express";
import { bookShow, showBookings } from "../controller/bookingsController.ts";
import { authMiddleWare } from "../middleware/auth.ts";

const bookingsRouter = express.Router();

bookingsRouter.route("/")
    .post(authMiddleWare, bookShow)
    .get(authMiddleWare, showBookings);

export { bookingsRouter };


// :3000/api/v1/auth/