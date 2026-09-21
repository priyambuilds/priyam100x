import express from "express";
import { topUpWalletController, getWalletController } from "../controller/walletController";
import { authMiddleWare } from "../middleware/auth";
import { validateBody } from "../middleware/validateBody";
import { walletTopUpSchema } from "../types";

export const walletRouter = express.Router()
walletRouter.post("/top-up", authMiddleWare, validateBody(walletTopUpSchema), topUpWalletController)
walletRouter.get("/", authMiddleWare, getWalletController)