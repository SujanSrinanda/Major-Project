import { Request, Response, NextFunction } from 'express';
import { transactionService, TransactionService } from '../services/transaction.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class TransactionController {
  constructor(private txSvc: TransactionService = transactionService) {}

  getTransactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.txSvc.getTransactions(req.user!.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  createTransaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.txSvc.createTransaction(req.user!, req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  evaluateTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.txSvc.evaluateTransaction(req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      console.error('Error evaluating transaction in controller:', err);
      return res.status(500).json({
        decision: 'BLOCK',
        safetyScore: 0,
        riskLevel: 'CRITICAL',
        userMessage: 'SentinelFin cannot verify this payment right now. Payment paused for safety.',
        humanReasons: ['Security check could not be completed safely.'],
      });
    }
  };
}

export const transactionController = new TransactionController();
