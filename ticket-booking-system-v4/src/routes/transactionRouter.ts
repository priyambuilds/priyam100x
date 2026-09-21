import express from "express";
import { getTransactionsController } from "../controller/transactionController";
import { authMiddleWare } from '../middleware/auth';

export const transactionRouter = express.Router()

// Returns the authenticated user’s wallet and booking transactions. Or returns all transactions if it's an admin
transactionRouter.get("/", authMiddleWare, getTransactionsController)