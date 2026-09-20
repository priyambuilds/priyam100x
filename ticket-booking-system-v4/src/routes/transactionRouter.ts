import express from "express";
import { getTransactionsController } from "../controller/transactionController";
import { authMiddleWare } from '../middleware/auth';

export const transactionRouter = express.Router()
transactionRouter.get("/", authMiddleWare, getTransactionsController)