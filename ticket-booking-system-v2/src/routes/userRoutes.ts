import express from "express";
import { signinController, signupController } from "../controller/userController.ts";

const userRouter = express.Router();

userRouter.post("/signup", signupController);
userRouter.post("/signin", signinController);

export { userRouter };


// :3000/api/v1/auth/