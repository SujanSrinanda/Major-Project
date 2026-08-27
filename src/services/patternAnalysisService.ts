import { Transaction, RecurringPatternFlag } from '../types';

/**
 * Service that performs recurring pattern analysis on transaction history
 * to automatically detect and flag high-risk behavioral anomalies.
 */
export function analyzeTransactionPatterns(transactions: Transaction[]): Transaction[] {
  if (!transactions || transactions.length === 0) return [];

  // Group transactions by recipient phone / VPA key
  const groupedByRecipient: Record<string, Transaction[]> = {};

  transactions.forEach((tx) => {
    const key = (tx.recipientPhone || tx.recipientName || 'unknown').toLowerCase().trim();
    if (!groupedByRecipient[key]) {
      groupedByRecipient[key] = [];
    }
    groupedByRecipient[key].push(tx);
  });

  // Process each transaction to check if it matches a high-risk recurring pattern
  return transactions.map((tx) => {
    // If transaction is already explicitly blocked or challenged, check patterns or keep flag
    const key = (tx.recipientPhone || tx.recipientName || 'unknown').toLowerCase().trim();
    const recipientHistory = groupedByRecipient[key] || [];

    const flag = detectRecurringPatternFlag(tx, recipientHistory, transactions);

    return {
      ...tx,
      highRiskPatternFlag: flag || tx.highRiskPatternFlag,
    };
  });
}

/**
 * Detects if a target transaction exhibits high-risk recurring patterns within the context of recipient history & global history.
 */
export function detectRecurringPatternFlag(
  targetTx: {
    id?: string;
    amount: number;
    recipientName: string;
    recipientPhone: string;
    timestamp: string;
    status?: string;
    decision?: string;
  },
  recipientHistory: Transaction[],
  allTransactions: Transaction[] = []
): RecurringPatternFlag | undefined {
  const targetTime = new Date(targetTx.timestamp).getTime();
  const ONE_HOUR = 1000 * 60 * 60;
  const TWENTY_FOUR_HOURS = ONE_HOUR * 24;
  const SIX_HOURS = ONE_HOUR * 6;

  // Filter history excluding the target transaction itself (if it has an id)
  const otherTx = recipientHistory.filter((t) => t.id !== targetTx.id);

  // 1. Rapid Burst Frequency (3+ transactions within 24 hours to same recipient)
  const last24hTx = otherTx.filter((t) => {
    const timeDiff = Math.abs(targetTime - new Date(t.timestamp).getTime());
    return timeDiff <= TWENTY_FOUR_HOURS;
  });

  const countIn24h = last24hTx.length + 1;
  const totalAmount24h = last24hTx.reduce((sum, t) => sum + t.amount, 0) + targetTx.amount;

  if (countIn24h >= 3) {
    return {
      isHighRisk: true,
      patternType: 'RAPID_BURST',
      label: 'High-Risk: Rapid Velocity Burst',
      reason: `Unusual transaction burst: ${countIn24h} transfers totaling ₹${totalAmount24h.toLocaleString(
        'en-IN'
      )} within 24 hours to ${targetTx.recipientName}.`,
      severity: 'HIGH',
      detectedAt: new Date().toISOString(),
      countInWindow: countIn24h,
    };
  }

  // 2. Split Transaction Structuring (Smurfing pattern: multiple transfers between 8k and 15k within 6 hours)
  const isStructuringAmount = targetTx.amount >= 7500 && targetTx.amount <= 14999;
  if (isStructuringAmount) {
    const recentStructuringTx = otherTx.filter((t) => {
      const timeDiff = Math.abs(targetTime - new Date(t.timestamp).getTime());
      return timeDiff <= SIX_HOURS && t.amount >= 7500 && t.amount <= 14999;
    });

    if (recentStructuringTx.length >= 1) {
      return {
        isHighRisk: true,
        patternType: 'SPLIT_STRUCTURING',
        label: 'High-Risk: Structuring Pattern Flagged',
        reason: `Potential payment structuring detected: Multiple consecutive transfers (₹${targetTx.amount.toLocaleString(
          'en-IN'
        )}) engineered just below high-verification limit.`,
        severity: 'CRITICAL',
        detectedAt: new Date().toISOString(),
        countInWindow: recentStructuringTx.length + 1,
      };
    }
  }

  // 3. Duplicate High-Value Recurrence (2+ identical payments >= ₹5,000 within 12 hours)
  const duplicateHighVal = otherTx.filter((t) => {
    const timeDiff = Math.abs(targetTime - new Date(t.timestamp).getTime());
    return timeDiff <= ONE_HOUR * 12 && Math.abs(t.amount - targetTx.amount) < 10;
  });

  if (targetTx.amount >= 5000 && duplicateHighVal.length >= 1) {
    return {
      isHighRisk: true,
      patternType: 'RECURRING_ANOMALY',
      label: 'High-Risk: Duplicate Amount Anomaly',
      reason: `Duplicate high-value payment detected: Repeated transfer of ₹${targetTx.amount.toLocaleString(
        'en-IN'
      )} sent to ${targetTx.recipientName} within short window.`,
      severity: 'HIGH',
      detectedAt: new Date().toISOString(),
      countInWindow: duplicateHighVal.length + 1,
    };
  }

  // 4. Velocity Spike (Amount is > 3.5x higher than historical average for this recipient)
  if (otherTx.length >= 2) {
    const avgHistorical =
      otherTx.reduce((sum, t) => sum + t.amount, 0) / otherTx.length;
    if (avgHistorical > 0 && targetTx.amount >= avgHistorical * 3.5 && targetTx.amount >= 3000) {
      return {
        isHighRisk: true,
        patternType: 'VELOCITY_SPIKE',
        label: 'High-Risk: Significant Velocity Spike',
        reason: `Anomalous payment spike: ₹${targetTx.amount.toLocaleString(
          'en-IN'
        )} is ${Math.round(
          targetTx.amount / avgHistorical
        )}x higher than recipient's historical average of ₹${Math.round(
          avgHistorical
        ).toLocaleString('en-IN')}.`,
        severity: 'HIGH',
        detectedAt: new Date().toISOString(),
      };
    }
  }

  return undefined;
}
