import { Transaction, SecurityAlert } from '../types';

export type TransactionCategory =
  | 'Food & Dining'
  | 'Bills & Utilities'
  | 'Shopping'
  | 'Transfers'
  | 'Entertainment'
  | 'Others';

export const CATEGORIES: TransactionCategory[] = [
  'Food & Dining',
  'Bills & Utilities',
  'Shopping',
  'Transfers',
  'Entertainment',
  'Others',
];

export interface CategorySpendingSummary {
  category: TransactionCategory;
  spentAmount: number;
  thresholdAmount: number;
  percentageUsed: number;
  isExceeded: boolean;
  transactionCount: number;
}

export const DEFAULT_CATEGORY_THRESHOLDS: Record<TransactionCategory, number> = {
  'Food & Dining': 3000,
  'Bills & Utilities': 5000,
  'Shopping': 10000,
  'Transfers': 20000,
  'Entertainment': 2500,
  'Others': 5000,
};

/**
 * Infer spending category based on recipient name, note, or type
 */
export function inferCategory(
  recipientName: string,
  note: string = '',
  explicitCategory?: TransactionCategory
): TransactionCategory {
  if (explicitCategory && CATEGORIES.includes(explicitCategory)) {
    return explicitCategory;
  }

  const combined = `${recipientName} ${note}`.toLowerCase();

  if (
    /coffee|starbucks|dinner|restaurant|food|zomato|swiggy|cafe|tea|bakery|snack|mcdonalds|pizza/i.test(
      combined
    )
  ) {
    return 'Food & Dining';
  }

  if (
    /electricity|water|gas|recharge|utility|board|bill|rent|wifi|broadband|bescom|airtel|jio/i.test(
      combined
    )
  ) {
    return 'Bills & Utilities';
  }

  if (
    /shop|store|supermarket|amazon|flipkart|mall|clothing|mart|retail|zara|fresh mart/i.test(
      combined
    )
  ) {
    return 'Shopping';
  }

  if (
    /movie|cinema|pvr|game|netflix|spotify|hotstar|bookmyshow|steam|playstation/i.test(
      combined
    )
  ) {
    return 'Entertainment';
  }

  if (
    /rahul|priya|ankit|friend|split|wire|transfer|phone|paytm|gpay|upi|contact/i.test(
      combined
    )
  ) {
    return 'Transfers';
  }

  return 'Others';
}

/**
 * Calculates total spending for the current month broken down by category
 */
export function calculateMonthlyCategorySpending(
  transactions: Transaction[],
  thresholds: Record<TransactionCategory, number>,
  targetDate: Date = new Date()
): CategorySpendingSummary[] {
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth();

  // Filter transactions for current month with completed/allowed status
  const currentMonthTx = transactions.filter((tx) => {
    if (tx.status !== 'COMPLETED' && tx.decision !== 'ALLOW') {
      return false;
    }
    const txDate = new Date(tx.timestamp);
    return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
  });

  // Group sum amounts per category
  const categorySums: Record<TransactionCategory, number> = {
    'Food & Dining': 0,
    'Bills & Utilities': 0,
    Shopping: 0,
    Transfers: 0,
    Entertainment: 0,
    Others: 0,
  };

  const categoryCounts: Record<TransactionCategory, number> = {
    'Food & Dining': 0,
    'Bills & Utilities': 0,
    Shopping: 0,
    Transfers: 0,
    Entertainment: 0,
    Others: 0,
  };

  currentMonthTx.forEach((tx) => {
    const cat = tx.category || inferCategory(tx.recipientName, tx.note);
    categorySums[cat] = (categorySums[cat] || 0) + tx.amount;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return CATEGORIES.map((cat) => {
    const spent = categorySums[cat] || 0;
    const thresh = thresholds[cat] || DEFAULT_CATEGORY_THRESHOLDS[cat] || 5000;
    const percentageUsed = Math.min(999, Math.round((spent / thresh) * 100));
    const isExceeded = spent > thresh;

    return {
      category: cat,
      spentAmount: spent,
      thresholdAmount: thresh,
      percentageUsed,
      isExceeded,
      transactionCount: categoryCounts[cat] || 0,
    };
  }).sort((a, b) => b.percentageUsed - a.percentageUsed);
}

/**
 * Checks monthly category spending against predefined thresholds and returns warning alerts for breached categories.
 */
export function evaluateSpendingThresholdAlerts(
  transactions: Transaction[],
  thresholds: Record<TransactionCategory, number>,
  existingAlerts: SecurityAlert[],
  userId: string = 'demo-user-123',
  targetDate: Date = new Date()
): SecurityAlert[] {
  const summaries = calculateMonthlyCategorySpending(transactions, thresholds, targetDate);
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth() + 1;
  const monthName = targetDate.toLocaleString('default', { month: 'long' });

  const newAlerts: SecurityAlert[] = [];

  summaries.forEach((summary) => {
    if (summary.isExceeded) {
      const alertTitle = `${summary.category} Threshold Exceeded`;

      // Check if an alert for this category already exists in the current month
      const alreadyTriggered = existingAlerts.some(
        (a) =>
          a.title.includes(summary.category) &&
          a.title.includes('Threshold Exceeded') &&
          new Date(a.timestamp).getFullYear() === currentYear &&
          new Date(a.timestamp).getMonth() + 1 === currentMonth
      );

      if (!alreadyTriggered) {
        const warningAlert: SecurityAlert = {
          id: `alt-spending-${summary.category.replace(/\s+/g, '-').toLowerCase()}-${currentYear}-${currentMonth}`,
          userId,
          title: alertTitle,
          message: `Monthly spending on ${summary.category} is ₹${summary.spentAmount.toLocaleString(
            'en-IN'
          )}, exceeding your ${monthName} limit of ₹${summary.thresholdAmount.toLocaleString('en-IN')}.`,
          severity: 'high',
          timestamp: new Date().toISOString(),
          isRead: false,
          actionTaken: 'Category Threshold Warning Issued',
        };
        newAlerts.push(warningAlert);
      }
    }
  });

  return newAlerts;
}
