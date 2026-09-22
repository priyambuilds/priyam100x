import { type Request, type Response, type NextFunction } from 'express';
import { getWalletService, topUpWalletService } from './service/walletService';

export async function topUpWalletController (req:Request, res: Response, next: NextFunction ) {
    try {
        const wallet = await topUpWalletService(req.userId, req.body.amountCents)
        return res.status(200).json({
            success: true,
            message: "Wallet topup succeeded",
            data: [{wallet}]
        })
    } catch (e){
        next(e)
    }
}
export async function getWalletController (req:Request, res: Response, next: NextFunction ) {
    try {
        const wallet = await getWalletService(req.userId)
        return res.status(200).json({
            success: true,
            message: "Below is your wallet's current balance",
            data: [{wallet}]
        })
    } catch (e){
        next(e)
    }
}
