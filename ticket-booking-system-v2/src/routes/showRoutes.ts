import express from "express";
import { createShows, showShows, showShowsById } from "../controller/showController.ts";
import { authMiddleWare } from "../middleware/auth.ts";

const showRouter = express.Router();

showRouter.route("/")
    .post(authMiddleWare, createShows)
    .get(showShows)

showRouter.route("/:showId")
    .get(showShowsById)


export default showRouter;


// :3000/api/v1/auth/