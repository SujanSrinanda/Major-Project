import { Response, NextFunction } from 'express';
import { budgetService, BudgetService } from '../services/budget.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class BudgetController {
  constructor(private budgetSvc: BudgetService = budgetService) {}

  getBudget = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.budgetSvc.getBudget(req.user!.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  updateBudget = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.budgetSvc.updateBudget(req.user!.id, req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  getCategories = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.budgetSvc.getCategories(req.user!.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };
}

export const budgetController = new BudgetController();
