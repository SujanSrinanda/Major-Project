import { Router } from 'express';
import { budgetController } from '../controllers/budget.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const budgetRouter = Router();

budgetRouter.get('/', requireAuth, budgetController.getBudget);
budgetRouter.post('/', requireAuth, budgetController.updateBudget);
budgetRouter.put('/', requireAuth, budgetController.updateBudget);
budgetRouter.get('/categories', requireAuth, budgetController.getCategories);
