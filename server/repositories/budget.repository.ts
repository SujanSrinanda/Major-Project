import { getSqliteClient } from '../db/database';
import { UserBudget } from '../db';

export class BudgetRepository {
  async findByUserId(userId: string): Promise<UserBudget | undefined> {
    const client = getSqliteClient();
    const budgetRes = await client.execute({
      sql: 'SELECT * FROM budgets WHERE user_id = ? LIMIT 1;',
      args: [userId],
    });

    if (budgetRes.rows.length === 0) return undefined;
    const budgetRow: any = budgetRes.rows[0];

    const catRes = await client.execute({
      sql: 'SELECT * FROM budget_categories WHERE user_id = ? ORDER BY id ASC;',
      args: [userId],
    });

    const categories = catRes.rows.map((row: any) => ({
      id: String(row.id),
      userId: String(row.user_id),
      category: String(row.category),
      limit: Number(row.limit_amount),
    }));

    return {
      userId: String(budgetRow.user_id),
      monthlyLimit: Number(budgetRow.monthly_limit),
      categories,
    };
  }

  async save(budget: UserBudget): Promise<void> {
    const client = getSqliteClient();
    const statements: Array<{ sql: string; args: any[] }> = [];

    statements.push({
      sql: `INSERT INTO budgets (user_id, monthly_limit, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              monthly_limit = excluded.monthly_limit,
              updated_at = excluded.updated_at;`,
      args: [budget.userId, budget.monthlyLimit, new Date().toISOString()],
    });

    // Delete existing categories for user
    statements.push({
      sql: 'DELETE FROM budget_categories WHERE user_id = ?;',
      args: [budget.userId],
    });

    // Insert categories
    if (budget.categories && budget.categories.length > 0) {
      for (const cat of budget.categories) {
        statements.push({
          sql: `INSERT INTO budget_categories (id, user_id, category, limit_amount, created_at)
                VALUES (?, ?, ?, ?, ?);`,
          args: [
            cat.id || `cat-${budget.userId}-${cat.category}`,
            budget.userId,
            cat.category,
            cat.limit,
            new Date().toISOString(),
          ],
        });
      }
    }

    await client.batch(statements, 'write');
  }
}

export const budgetRepository = new BudgetRepository();
