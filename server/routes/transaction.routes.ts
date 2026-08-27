import { Router } from 'express';
import { transactionController } from '../controllers/transaction.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const transactionRouter = Router();

transactionRouter.get('/', requireAuth, transactionController.getTransactions);
transactionRouter.post('/', requireAuth, transactionController.createTransaction);
transactionRouter.post('/evaluate', requireAuth, transactionController.evaluateTransaction);
