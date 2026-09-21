import express from "express";
import { topUpWalletController, getWalletController } from "../controller/walletController";
import { authMiddleWare } from "../middleware/auth";

export const walletRouter = express.Router()
walletRouter.post("/top-up", authMiddleWare, topUpWalletController)
walletRouter.get("/", authMiddleWare, getWalletController)