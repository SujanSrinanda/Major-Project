import { SecurityAlert } from '../types';

export interface PushNotificationPayload {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'BUDGET_EXCEEDED' | 'BUDGET_80_PERCENT_WARNING' | 'CATEGORY_EXCEEDED' | 'SECURITY';
  data?: {
    amount?: number;
    recipientName?: string;
    newTotalSpent?: number;
    budgetLimit?: number;
  };
}

type PushNotificationListener = (notification: PushNotificationPayload) => void;

class PushNotificationService {
  private listeners: PushNotificationListener[] = [];
  private hasPermission: boolean = false;

  constructor() {
    this.checkBrowserPermission();
  }

  private checkBrowserPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.hasPermission = Notification.permission === 'granted';
    }
  }

  /**
   * Request browser push notification permission
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    } catch (err) {
      console.warn('Push notification permission error:', err);
      return false;
    }
  }

  /**
   * Subscribe in-app components to push notification events
   */
  public subscribe(listener: PushNotificationListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Dispatch a push notification across both standard Web Notifications API and In-App Banner overlays
   */
  public dispatchPushNotification(payload: Omit<PushNotificationPayload, 'id' | 'timestamp'>) {
    const fullNotification: PushNotificationPayload = {
      id: `push-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    // 1. Dispatch Web Browser Push Notification if supported and permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(fullNotification.title, {
          body: fullNotification.body,
          icon: '/icon.png',
          tag: fullNotification.type,
        });
      } catch (err) {
        console.warn('Native push dispatch issue:', err);
      }
    }

    // 2. Notify all in-app UI listeners (Floating Toast Banner)
    this.listeners.forEach((listener) => {
      try {
        listener(fullNotification);
      } catch (e) {
        console.error('Push listener error:', e);
      }
    });

    return fullNotification;
  }

  /**
   * Specifically triggers a budget limit breach push notification when a transaction causes spending to exceed monthly limit
   */
  public notifyBudgetExceeded(params: {
    transactionAmount: number;
    recipientName: string;
    newTotalSpent: number;
    previousTotalSpent: number;
    budgetLimit: number;
    userId?: string;
  }): SecurityAlert {
    const { transactionAmount, recipientName, newTotalSpent, previousTotalSpent, budgetLimit, userId = 'demo-user-123' } = params;

    const title = '🚨 Monthly Budget Limit Exceeded!';
    const body = `Payment of ₹${transactionAmount.toLocaleString('en-IN')} to ${recipientName} pushed your monthly spending to ₹${newTotalSpent.toLocaleString('en-IN')}, breaching your defined cap of ₹${budgetLimit.toLocaleString('en-IN')}.`;

    // Trigger Push Notification
    this.dispatchPushNotification({
      title,
      body,
      type: 'BUDGET_EXCEEDED',
      data: {
        amount: transactionAmount,
        recipientName,
        newTotalSpent,
        budgetLimit,
      },
    });

    // Generate corresponding SecurityAlert record for SafetyCenter
    const alertRecord: SecurityAlert = {
      id: `alt-budget-${Date.now()}`,
      userId,
      title: 'Monthly Budget Cap Breached',
      message: body,
      severity: 'high',
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTaken: 'Budget Push Notification Sent',
    };

    return alertRecord;
  }

  /**
   * Specifically triggers an 80% budget warning push notification when spending reaches or exceeds 80% of monthly limit
   */
  public notifyBudget80PercentWarning(params: {
    transactionAmount?: number;
    recipientName?: string;
    newTotalSpent: number;
    budgetLimit: number;
    userId?: string;
  }): SecurityAlert {
    const { transactionAmount, recipientName, newTotalSpent, budgetLimit, userId = 'demo-user-123' } = params;

    const percentage = Math.round((newTotalSpent / budgetLimit) * 100);
    const title = '⚠️ 80% Monthly Budget Warning!';
    const body = recipientName && transactionAmount
      ? `Payment of ₹${transactionAmount.toLocaleString('en-IN')} to ${recipientName} brought your monthly spending to ₹${newTotalSpent.toLocaleString('en-IN')}, crossing ${percentage}% of your defined ₹${budgetLimit.toLocaleString('en-IN')} cap.`
      : `Your total monthly spending has reached ₹${newTotalSpent.toLocaleString('en-IN')}, which is ${percentage}% of your defined ₹${budgetLimit.toLocaleString('en-IN')} monthly budget cap.`;

    // Trigger Push Notification Toast
    this.dispatchPushNotification({
      title,
      body,
      type: 'BUDGET_80_PERCENT_WARNING',
      data: {
        amount: transactionAmount,
        recipientName,
        newTotalSpent,
        budgetLimit,
      },
    });

    // Generate corresponding SecurityAlert record for SafetyCenter
    const alertRecord: SecurityAlert = {
      id: `alt-budget-80-${Date.now()}`,
      userId,
      title: '80% Monthly Budget Threshold Warning',
      message: body,
      severity: 'medium',
      timestamp: new Date().toISOString(),
      isRead: false,
      actionTaken: 'Budget 80% Toast Alert Triggered',
    };

    return alertRecord;
  }
}

export const pushNotificationService = new PushNotificationService();
