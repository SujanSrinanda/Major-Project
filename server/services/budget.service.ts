import { budgetRepository, BudgetRepository } from '../repositories/budget.repository';

export class BudgetService {
  constructor(private budgetRepo: BudgetRepository = budgetRepository) {}

  async getBudget(userId: string) {
    const b = await this.budgetRepo.findByUserId(userId);
    return {
      status: 200,
      data: b || { userId, monthlyLimit: 45000, categories: [] },
    };
  }

  async updateBudget(userId: string, data: { monthlyLimit?: number; categories?: any[] }) {
    const { monthlyLimit, categories } = data;
    const existing = (await this.budgetRepo.findByUserId(userId)) || { userId, monthlyLimit: 45000, categories: [] };

    if (monthlyLimit !== undefined) existing.monthlyLimit = Number(monthlyLimit);
    if (categories) existing.categories = categories;

    await this.budgetRepo.save(existing);
    return { status: 200, data: { success: true, budget: existing } };
  }

  async getCategories(userId: string) {
    const b = await this.budgetRepo.findByUserId(userId);
    return { status: 200, data: b ? b.categories : [] };
  }
}

export const budgetService = new BudgetService();
