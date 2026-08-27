import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { userApi, onUnauthorized } from '../services/api';
import {
  Transaction,
  Contact,
  SecurityAlert,
  TrustedDevice,
  RiskEvaluationRequest,
  RiskEvaluationResponse,
  TransactionCategory,
  ModelWeights,
} from '../types';
import { evaluateTransactionRisk, DEFAULT_MODEL_WEIGHTS } from '../utils/riskEngine';
import {
  DEFAULT_CATEGORY_THRESHOLDS,
  CategorySpendingSummary,
  calculateMonthlyCategorySpending,
  evaluateSpendingThresholdAlerts,
  inferCategory,
} from '../services/spendingService';
import { pushNotificationService } from '../services/pushNotificationService';
import {
  analyzeTransactionPatterns,
  detectRecurringPatternFlag,
} from '../services/patternAnalysisService';

interface TransactionContextType {
  transactions: Transaction[];
  highRiskFlaggedTransactions: Transaction[];
  flaggedPatternCount: number;
  contacts: Contact[];
  alerts: SecurityAlert[];
  devices: TrustedDevice[];
  loading: boolean;
  error: string | null;
  activeTransaction: Transaction | null;
  categoryThresholds: Record<TransactionCategory, number>;
  monthlyCategorySummaries: CategorySpendingSummary[];
  monthlyBudgetLimit: number;
  totalMonthlySpent: number;
  budgetPercentageUsed: number;
  modelWeights: ModelWeights;
  updateMonthlyBudgetLimit: (newLimit: number) => void;
  updateCategoryThreshold: (category: TransactionCategory, newThreshold: number) => void;
  updateModelWeights: (weights: Partial<ModelWeights>) => void;
  resetModelWeights: () => void;
  setActiveTransaction: (tx: Transaction | null) => void;
  evaluatePayment: (req: RiskEvaluationRequest) => Promise<RiskEvaluationResponse>;
  confirmPayment: (
    req: RiskEvaluationRequest,
    evaluation: RiskEvaluationResponse
  ) => Promise<Transaction>;
  addContact: (contact: Omit<Contact, 'id' | 'userId'>) => Promise<Contact>;
  toggleFavoriteContact: (id: string) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  markAlertRead: (id: string) => Promise<void>;
  dismissAlert: (id: string) => Promise<void>;
  clearAllAlerts: () => Promise<void>;
  removeDevice: (id: string) => Promise<void>;
  getContactByPhone: (phone: string) => Contact | undefined;
  refreshData: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, updateProfileData, isAuthenticated } = useAuth();
  const userId = user?.id || profile?.uid || '';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);

  const [modelWeights, setModelWeights] = useState<ModelWeights>(() => {
    try {
      const saved = localStorage.getItem('sentinel_model_weights');
      return saved ? { ...DEFAULT_MODEL_WEIGHTS, ...JSON.parse(saved) } : DEFAULT_MODEL_WEIGHTS;
    } catch {
      return DEFAULT_MODEL_WEIGHTS;
    }
  });

  const updateModelWeights = (newWeights: Partial<ModelWeights>) => {
    setModelWeights((prev) => {
      const updated = { ...prev, ...newWeights };
      try {
        localStorage.setItem('sentinel_model_weights', JSON.stringify(updated));
      } catch {
        // Ignored
      }
      return updated;
    });
  };

  const resetModelWeights = () => {
    setModelWeights(DEFAULT_MODEL_WEIGHTS);
    try {
      localStorage.setItem('sentinel_model_weights', JSON.stringify(DEFAULT_MODEL_WEIGHTS));
    } catch {
      // Ignored
    }
  };

  const [categoryThresholds, setCategoryThresholds] = useState<Record<TransactionCategory, number>>(() => {
    try {
      const saved = localStorage.getItem('sentinel_category_thresholds');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORY_THRESHOLDS;
    } catch {
      return DEFAULT_CATEGORY_THRESHOLDS;
    }
  });

  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState<number>(45000);

  const clearUserData = useCallback(() => {
    setTransactions([]);
    setContacts([]);
    setAlerts([]);
    setDevices([]);
    setActiveTransaction(null);
    setMonthlyBudgetLimit(45000);
    setCategoryThresholds(DEFAULT_CATEGORY_THRESHOLDS);
    setError(null);
  }, []);

  const loadUserData = useCallback(async () => {
    if (!isAuthenticated) {
      clearUserData();
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [txs, cnts, alrts, dvcs, bdgt] = await Promise.allSettled([
        userApi.getTransactions(),
        userApi.getContacts(),
        userApi.getAlerts(),
        userApi.getDevices(),
        userApi.getBudgets(),
      ]);

      if (txs.status === 'fulfilled') {
        setTransactions(Array.isArray(txs.value) ? txs.value : []);
      } else {
        console.error('Failed to fetch transactions from server:', txs.reason);
        setTransactions([]);
        setError('Unable to load transactions from server.');
      }

      if (cnts.status === 'fulfilled') {
        setContacts(Array.isArray(cnts.value) ? cnts.value : []);
      } else {
        console.error('Failed to fetch contacts from server:', cnts.reason);
        setContacts([]);
      }

      if (alrts.status === 'fulfilled') {
        setAlerts(Array.isArray(alrts.value) ? alrts.value : []);
      } else {
        console.error('Failed to fetch alerts from server:', alrts.reason);
        setAlerts([]);
      }

      if (dvcs.status === 'fulfilled') {
        setDevices(Array.isArray(dvcs.value) ? dvcs.value : []);
      } else {
        console.error('Failed to fetch devices from server:', dvcs.reason);
        setDevices([]);
      }

      if (bdgt.status === 'fulfilled' && bdgt.value) {
        if (bdgt.value.monthlyLimit && !isNaN(Number(bdgt.value.monthlyLimit))) {
          setMonthlyBudgetLimit(Number(bdgt.value.monthlyLimit));
        }
        if (Array.isArray(bdgt.value.categories) && bdgt.value.categories.length > 0) {
          const loadedThresholds: Record<string, number> = { ...DEFAULT_CATEGORY_THRESHOLDS };
          bdgt.value.categories.forEach((c: any) => {
            if (c.category && !isNaN(Number(c.limit))) {
              loadedThresholds[c.category] = Number(c.limit);
            }
          });
          setCategoryThresholds(loadedThresholds as Record<TransactionCategory, number>);
          try {
            localStorage.setItem('sentinel_category_thresholds', JSON.stringify(loadedThresholds));
          } catch {
            // Ignored
          }
        }
      }
    } catch (e: any) {
      console.warn('Error loading user data from backend API:', e);
      setError(e?.message || 'Error loading account data.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, clearUserData]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      clearUserData();
      setLoading(false);
    });
    return () => unsubscribe();
  }, [clearUserData]);

  const updateMonthlyBudgetLimit = async (newLimit: number) => {
    if (isNaN(newLimit) || newLimit <= 0) return;
    const prevLimit = monthlyBudgetLimit;
    setMonthlyBudgetLimit(newLimit);
    if (isAuthenticated) {
      try {
        const catList = Object.entries(categoryThresholds).map(([category, limit]) => ({
          category,
          limit,
        }));
        await userApi.updateBudget({ monthlyLimit: newLimit, categories: catList });
      } catch (e) {
        console.error('Failed to persist budget limit:', e);
        // Rollback to previous confirmed limit on failure
        setMonthlyBudgetLimit(prevLimit);
        throw e;
      }
    }
  };

  const updateCategoryThreshold = async (category: TransactionCategory, newThreshold: number) => {
    if (isNaN(newThreshold) || newThreshold <= 0) return;
    const prevThresholds = { ...categoryThresholds };
    const updated = { ...categoryThresholds, [category]: newThreshold };
    setCategoryThresholds(updated);
    try {
      localStorage.setItem('sentinel_category_thresholds', JSON.stringify(updated));
    } catch {
      // Local handled
    }

    if (isAuthenticated) {
      try {
        const catList = Object.entries(updated).map(([cat, limit]) => ({
          category: cat,
          limit,
        }));
        await userApi.updateBudget({ monthlyLimit: monthlyBudgetLimit, categories: catList });
      } catch (e) {
        console.error('Failed to persist category threshold:', e);
        // Rollback on failure
        setCategoryThresholds(prevThresholds);
        try {
          localStorage.setItem('sentinel_category_thresholds', JSON.stringify(prevThresholds));
        } catch {
          // Local handled
        }
        throw e;
      }
    }
  };

  const analyzedTransactions = analyzeTransactionPatterns(transactions);
  const highRiskFlaggedTransactions = analyzedTransactions.filter(
    (tx) => tx.highRiskPatternFlag?.isHighRisk || tx.riskLevel === 'HIGH' || tx.riskLevel === 'CRITICAL'
  );
  const flaggedPatternCount = highRiskFlaggedTransactions.length;

  const monthlyCategorySummaries = calculateMonthlyCategorySpending(analyzedTransactions, categoryThresholds);
  const totalMonthlySpent = monthlyCategorySummaries.reduce((acc, curr) => acc + curr.spentAmount, 0);
  const budgetPercentageUsed = monthlyBudgetLimit > 0 ? Math.min(999, Math.round((totalMonthlySpent / monthlyBudgetLimit) * 100)) : 0;

  const hasTriggered80Ref = React.useRef<string | null>(null);

  useEffect(() => {
    if (loading || transactions.length === 0 || !userId) return;

    const newThresholdAlerts = evaluateSpendingThresholdAlerts(
      transactions,
      categoryThresholds,
      alerts,
      userId
    );

    if (newThresholdAlerts.length > 0) {
      setAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const toAdd = newThresholdAlerts.filter((a) => !existingIds.has(a.id));
        return [...toAdd, ...prev];
      });
    }

    // Check if user has reached or exceeded 80% of monthly spending limit
    if (monthlyBudgetLimit > 0) {
      const isOver80 = totalMonthlySpent >= 0.8 * monthlyBudgetLimit;
      const isOver100 = totalMonthlySpent > monthlyBudgetLimit;
      const currentMonthKey = `${new Date().getFullYear()}-${new Date().getMonth()}-${monthlyBudgetLimit}`;

      if (isOver80 && !isOver100 && hasTriggered80Ref.current !== currentMonthKey) {
        const alreadyHasAlert = alerts.some((a) => a.title.includes('80% Monthly Budget'));
        if (!alreadyHasAlert) {
          const pushAlert = pushNotificationService.notifyBudget80PercentWarning({
            newTotalSpent: totalMonthlySpent,
            budgetLimit: monthlyBudgetLimit,
            userId,
          });
          setAlerts((prev) => [pushAlert, ...prev]);
        }
        hasTriggered80Ref.current = currentMonthKey;
      }
    }
  }, [transactions, categoryThresholds, totalMonthlySpent, monthlyBudgetLimit, userId, loading]);

  const evaluatePayment = async (req: RiskEvaluationRequest): Promise<RiskEvaluationResponse> => {
    try {
      return await userApi.evaluateTransactionRisk(req);
    } catch (e) {
      return await evaluateTransactionRisk(req, modelWeights);
    }
  };

  const confirmPayment = async (
    req: RiskEvaluationRequest,
    evaluation: RiskEvaluationResponse
  ): Promise<Transaction> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to process payments.');
    }

    const isBlocked = evaluation.decision === 'BLOCK';
    const isChallenged = evaluation.decision === 'CHALLENGE';
    const category = req.category || inferCategory(req.recipientName, req.note);

    const newTxData: Omit<Transaction, 'id'> = {
      userId,
      recipientName: req.recipientName,
      recipientPhone: req.recipientPhone,
      amount: req.amount,
      note: req.note || '',
      category,
      type: req.paymentType,
      status: isBlocked ? 'BLOCKED' : isChallenged ? ('CHALLENGED' as any) : 'COMPLETED',
      decision: evaluation.decision,
      safetyScore: evaluation.safetyScore,
      riskLevel: evaluation.riskLevel,
      reasons: evaluation.humanReasons,
      technicalDetails: evaluation.technicalDetails,
      timestamp: new Date().toISOString(),
      isNewRecipient: req.isNewRecipient,
    };

    const patternFlag = detectRecurringPatternFlag(
      newTxData,
      transactions.filter((t) => t.recipientPhone === req.recipientPhone || t.recipientName === req.recipientName),
      transactions
    );
    const finalTxData = patternFlag ? { ...newTxData, highRiskPatternFlag: patternFlag } : newTxData;

    // Send real mutation to backend SQLite
    const createdTx = await userApi.addTransaction(finalTxData);
    setTransactions((prev) => [createdTx, ...prev]);

    if (patternFlag?.isHighRisk) {
      const patternAlert: SecurityAlert = {
        id: `alt-pat-${Date.now()}`,
        userId,
        title: patternFlag.label,
        message: patternFlag.reason,
        severity: patternFlag.severity === 'CRITICAL' ? 'critical' : 'high',
        timestamp: new Date().toISOString(),
        isRead: false,
        relatedTransactionId: createdTx.id,
        actionTaken: 'High-Risk Recurring Pattern Flagged',
      };
      setAlerts((prev) => [patternAlert, ...prev]);
    }

    if (evaluation.decision === 'ALLOW') {
      if (profile && profile.balance !== undefined) {
        const updatedBalance = Math.max(0, profile.balance - req.amount);
        await updateProfileData({ balance: updatedBalance });
      }

      const previousTotal = totalMonthlySpent;
      const newTotal = previousTotal + req.amount;

      const threshold80 = 0.8 * monthlyBudgetLimit;
      if (previousTotal < threshold80 && newTotal >= threshold80 && newTotal <= monthlyBudgetLimit) {
        const pushAlert = pushNotificationService.notifyBudget80PercentWarning({
          transactionAmount: req.amount,
          recipientName: req.recipientName,
          newTotalSpent: newTotal,
          budgetLimit: monthlyBudgetLimit,
          userId,
        });
        setAlerts((prev) => [pushAlert, ...prev]);
      } else if (newTotal > monthlyBudgetLimit) {
        const pushAlert = pushNotificationService.notifyBudgetExceeded({
          transactionAmount: req.amount,
          recipientName: req.recipientName,
          newTotalSpent: newTotal,
          previousTotalSpent: previousTotal,
          budgetLimit: monthlyBudgetLimit,
          userId,
        });
        setAlerts((prev) => [pushAlert, ...prev]);
      }
    }

    if (isBlocked) {
      const newAlert: SecurityAlert = {
        id: 'alt-' + Date.now(),
        userId,
        title: 'Payment Blocked by SentinelFin',
        message: `Stopped a suspicious transfer of ₹${req.amount.toLocaleString('en-IN')} to ${req.recipientName}.`,
        severity: 'critical',
        timestamp: new Date().toISOString(),
        isRead: false,
        relatedTransactionId: createdTx.id,
        actionTaken: 'Blocked to protect account',
      };
      setAlerts((prev) => [newAlert, ...prev]);
    }

    setActiveTransaction(createdTx);
    return createdTx;
  };

  const addContact = async (contactData: Omit<Contact, 'id' | 'userId'>): Promise<Contact> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to save contacts.');
    }
    const added = await userApi.addContact(contactData);
    setContacts((prev) => [added, ...prev]);
    return added;
  };

  const toggleFavoriteContact = async (id: string) => {
    const target = contacts.find((c) => c.id === id);
    if (!target) return;
    const updatedStatus = !target.isFavorite;

    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, isFavorite: updatedStatus } : c)));
    if (isAuthenticated) {
      try {
        await userApi.updateContact(id, { isFavorite: updatedStatus });
      } catch (e) {
        console.error('Failed to update favorite status:', e);
        // Revert on failure
        setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, isFavorite: !updatedStatus } : c)));
      }
    }
  };

  const deleteContact = async (id: string) => {
    const previous = [...contacts];
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (isAuthenticated) {
      try {
        await userApi.deleteContact(id);
      } catch (e) {
        console.error('Failed to delete contact:', e);
        setContacts(previous);
        throw e;
      }
    }
  };

  const markAlertRead = async (id: string) => {
    const previous = [...alerts];
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    if (isAuthenticated) {
      try {
        await userApi.updateAlert(id, { isRead: true });
      } catch (e) {
        console.error('Failed to mark alert as read:', e);
        setAlerts(previous);
        throw e;
      }
    }
  };

  const dismissAlert = async (id: string) => {
    const previous = [...alerts];
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (isAuthenticated) {
      try {
        await userApi.deleteAlert(id);
      } catch (e) {
        console.error('Failed to dismiss alert:', e);
        setAlerts(previous);
        throw e;
      }
    }
  };

  const clearAllAlerts = async () => {
    const previous = [...alerts];
    setAlerts([]);
    if (isAuthenticated) {
      try {
        await userApi.clearAllAlerts();
      } catch (e) {
        console.error('Failed to clear alerts:', e);
        setAlerts(previous);
        throw e;
      }
    }
  };

  const removeDevice = async (id: string) => {
    const previous = [...devices];
    setDevices((prev) => prev.filter((d) => d.id !== id));
    if (isAuthenticated) {
      try {
        await userApi.removeDevice(id);
      } catch (e) {
        console.error('Failed to remove device:', e);
        setDevices(previous);
        throw e;
      }
    }
  };

  const getContactByPhone = (phone: string): Contact | undefined => {
    const cleaned = phone.replace(/\D/g, '');
    return contacts.find((c) => c.phone.replace(/\D/g, '').endsWith(cleaned.slice(-10)));
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions: analyzedTransactions,
        highRiskFlaggedTransactions,
        flaggedPatternCount,
        contacts,
        alerts,
        devices,
        loading,
        error,
        activeTransaction,
        categoryThresholds,
        monthlyCategorySummaries,
        monthlyBudgetLimit,
        totalMonthlySpent,
        budgetPercentageUsed,
        modelWeights,
        updateMonthlyBudgetLimit,
        updateCategoryThreshold,
        updateModelWeights,
        resetModelWeights,
        setActiveTransaction,
        evaluatePayment,
        confirmPayment,
        addContact,
        toggleFavoriteContact,
        deleteContact,
        markAlertRead,
        dismissAlert,
        clearAllAlerts,
        removeDevice,
        getContactByPhone,
        refreshData: loadUserData,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) throw new Error('useTransactions must be used within a TransactionProvider');
  return context;
};

