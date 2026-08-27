import { Express } from 'express';
import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';
import { budgetRouter } from './budget.routes';
import { transactionRouter } from './transaction.routes';
import { contactRouter } from './contact.routes';
import { alertRouter } from './alert.routes';
import { deviceRouter } from './device.routes';
import { neo4jRouter } from './neo4j.routes';
import { transactionController } from '../controllers/transaction.controller';
import { requireAuth } from '../middleware/auth.middleware';

export function setupRoutes(app: Express) {
  // Mount feature routers
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/budgets', budgetRouter);
  app.use('/api/transactions', transactionRouter);
  app.use('/api/contacts', contactRouter);
  app.use('/api/alerts', alertRouter);
  app.use('/api/devices', deviceRouter);
  app.use('/api/neo4j', neo4jRouter);

  // Exact route alias for /api/evaluate-transaction (preserves existing client calls)
  app.post('/api/evaluate-transaction', requireAuth, transactionController.evaluateTransaction);
}
