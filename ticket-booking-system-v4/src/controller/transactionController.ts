import { type Request, type Response, type NextFunction } from 'express';
import { getTransactionsService } from './service/transactionsService';

export async function getTransactionsController (req: Request, res: Response, next: NextFunction) {
  try {
      const transactions = await getTransactionsService(req.userId)
      return res.status(200).json({
          success: true,
          data: transactions,
      })
  } catch (error) {
    next(error);
  }
}