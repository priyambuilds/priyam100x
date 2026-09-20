import express from "express";
import { SigninController, SignupController } from "../controller/userController";

export const authRouter = express.Router()
authRouter.post("/signup", SignupController)
authRouter.post("/signin", SigninController)