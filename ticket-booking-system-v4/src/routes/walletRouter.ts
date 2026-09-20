import express from "express";
import { addWallerController, getWalletController } from "../controller/walletController";
import { authMiddleWare } from "../middleware/auth";

export const walletRouter = express.Router()
walletRouter.post("/", authMiddleWare, addWallerController)
walletRouter.get("/", authMiddleWare, getWalletController)