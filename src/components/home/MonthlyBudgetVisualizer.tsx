import React, { useState } from 'react';
import {
  PieChart,
  Edit2,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { pushNotificationService } from '../../services/pushNotificationService';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';

interface MonthlyBudgetVisualizerProps {
  onNavigate?: (route: string) => void;
}

export const MonthlyBudgetVisualizer: React.FC<MonthlyBudgetVisualizerProps> = ({
  onNavigate,
}) => {
  const {
    monthlyBudgetLimit,
    totalMonthlySpent,
    budgetPercentageUsed,
    updateMonthlyBudgetLimit,
    monthlyCategorySummaries,
  } = useTransactions();

  const [isEditingCap, setIsEditingCap] = useState(false);
  const [capInput, setCapInput] = useState(monthlyBudgetLimit.toString());
  const [savingCap, setSavingCap] = useState(false);
  const [capError, setCapError] = useState<string | null>(null);

  const currentMonthName = new Date().toLocaleString('default', { month: 'long' }).toUpperCase();
  const currentYear = new Date().getFullYear();

  const handleSaveCap = async () => {
    const val = parseFloat(capInput);
    if (isNaN(val) || val <= 0) {
      setCapError('Enter a valid positive budget amount.');
      return;
    }
    try {
      setSavingCap(true);
      setCapError(null);
      await updateMonthlyBudgetLimit(val);
      setIsEditingCap(false);
    } catch (err: any) {
      setCapError(err?.message || 'Failed to update budget limit.');
    } finally {
      setSavingCap(false);
    }
  };

  const isExceeded = totalMonthlySpent > monthlyBudgetLimit;
  const isNearLimit = !isExceeded && budgetPercentageUsed >= 80;
  const remainingBudget = monthlyBudgetLimit - totalMonthlySpent;

  // Top 3 categories by spend
  const topCategories = [...monthlyCategorySummaries]
    .sort((a, b) => b.spentAmount - a.spentAmount)
    .filter((c) => c.spentAmount > 0)
    .slice(0, 3);

  let statusBg = 'bg-emerald-50 border-emerald-800 text-emerald-950';
  let progressBarColor = 'bg-[#7C3AED]';
  let badgeText = 'SAFE ENVELOPE';

  if (isExceeded) {
    statusBg = 'bg-red-50 border-red-800 text-red-950 ring-2 ring-red-500';
    progressBarColor = 'bg-red-600';
    badgeText = 'BUDGET EXCEEDED';
  } else if (isNearLimit) {
    statusBg = 'bg-amber-50 border-amber-800 text-amber-950';
    progressBarColor = 'bg-amber-500';
    badgeText = 'APPROACHING CAP';
  }

  return (
    <NeoCard className={`p-5 md:p-6 bg-white space-y-5 border-2 border-black neo-shadow transition-all ${statusBg}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-[#7C3AED] text-white border-2 border-black rounded-lg neo-shadow-sm">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-black/60">
                Monthly Spending Visualizer
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-black/5 border border-black/20 rounded">
                {currentMonthName} {currentYear}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black">
              Max Monthly Budget Cap
            </h2>
          </div>
        </div>

        {/* Status Badge & Demo Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              pushNotificationService.notifyBudget80PercentWarning({
                transactionAmount: 2500,
                recipientName: 'Reliance Digital',
                newTotalSpent: Math.round(monthlyBudgetLimit * 0.82),
                budgetLimit: monthlyBudgetLimit,
              });
            }}
            className="text-[10px] font-black uppercase px-2.5 py-1 bg-amber-100 text-amber-900 hover:bg-amber-200 border-2 border-black rounded neo-shadow-sm flex items-center gap-1 cursor-pointer transition-all"
            title="Trigger test 80% budget warning toast notification"
          >
            <Sparkles className="w-3 h-3 text-amber-700" />
            Test 80% Warning
          </button>

          <button
            type="button"
            onClick={() => {
              pushNotificationService.notifyBudgetExceeded({
                transactionAmount: 4500,
                recipientName: 'Apex Electronics',
                newTotalSpent: totalMonthlySpent + 4500,
                previousTotalSpent: totalMonthlySpent,
                budgetLimit: monthlyBudgetLimit,
              });
            }}
            className="text-[10px] font-black uppercase px-2.5 py-1 bg-purple-100 text-[#7C3AED] hover:bg-purple-200 border-2 border-black rounded neo-shadow-sm flex items-center gap-1 cursor-pointer transition-all"
            title="Trigger test budget exceeded push notification"
          >
            <Sparkles className="w-3 h-3" />
            Test Exceeded Alert
          </button>

          {isExceeded ? (
            <span className="text-xs font-black uppercase px-3 py-1 bg-red-600 text-white border-2 border-black rounded neo-shadow-sm flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {badgeText}
            </span>
          ) : isNearLimit ? (
            <span className="text-xs font-black uppercase px-3 py-1 bg-amber-400 text-black border-2 border-black rounded neo-shadow-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {badgeText}
            </span>
          ) : (
            <span className="text-xs font-black uppercase px-3 py-1 bg-emerald-100 text-emerald-950 border-2 border-black rounded neo-shadow-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              {badgeText}
            </span>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAF7F2] border-2 border-black p-4 neo-shadow-sm">
        {/* Spent */}
        <div>
          <span className="text-[11px] font-black uppercase text-black/60 block">
            Current Spend
          </span>
          <span className="text-2xl md:text-3xl font-black text-black tracking-tight block mt-0.5">
            ₹{totalMonthlySpent.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] font-bold text-black/60">Across all completed payments</span>
        </div>

        {/* Cap Limit & Inline Edit */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-black/60 block">
              Budget Cap Limit
            </span>
            {!isEditingCap && (
              <button
                type="button"
                onClick={() => {
                  setCapInput(monthlyBudgetLimit.toString());
                  setIsEditingCap(true);
                }}
                className="text-[11px] font-black uppercase text-[#7C3AED] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                Edit Cap
              </button>
            )}
          </div>

          {isEditingCap ? (
            <div className="mt-1">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-black">₹</span>
                <input
                  type="number"
                  value={capInput}
                  disabled={savingCap}
                  onChange={(e) => setCapInput(e.target.value)}
                  className="w-28 p-1 text-sm font-black border-2 border-black rounded bg-white disabled:opacity-50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveCap}
                  disabled={savingCap}
                  className="p-1.5 bg-emerald-600 text-white border border-black rounded hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  title="Save Cap"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingCap(false);
                    setCapError(null);
                    setCapInput(monthlyBudgetLimit.toString());
                  }}
                  disabled={savingCap}
                  className="p-1.5 bg-gray-300 text-black border border-black rounded hover:bg-gray-400 disabled:opacity-50 cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {capError && (
                <p className="text-[11px] font-bold text-red-600 mt-1">{capError}</p>
              )}
            </div>
          ) : (
            <span className="text-2xl md:text-3xl font-black text-black tracking-tight block mt-0.5">
              ₹{monthlyBudgetLimit.toLocaleString('en-IN')}
            </span>
          )}
          <span className="text-[10px] font-bold text-black/60">Defined spending threshold</span>
        </div>

        {/* Remaining / Over limit */}
        <div>
          <span className="text-[11px] font-black uppercase text-black/60 block">
            {isExceeded ? 'Exceeded Amount' : 'Remaining Envelope'}
          </span>
          <span
            className={`text-2xl md:text-3xl font-black tracking-tight block mt-0.5 ${
              isExceeded ? 'text-red-600' : 'text-emerald-700'
            }`}
          >
            {isExceeded
              ? `+₹${Math.abs(remainingBudget).toLocaleString('en-IN')}`
              : `₹${remainingBudget.toLocaleString('en-IN')}`}
          </span>
          <span className="text-[10px] font-bold text-black/60">
            {isExceeded ? 'Requires financial adjustment' : 'Available before reaching cap'}
          </span>
        </div>
      </div>

      {/* Progress Bar Visualizer */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-black uppercase">
          <span className="text-black">Budget Utilization</span>
          <span className="text-[#7C3AED] font-mono font-black">{budgetPercentageUsed}%</span>
        </div>

        <div className="w-full bg-gray-200 border-2 border-black h-5 rounded-full overflow-hidden p-0.5 neo-shadow-sm">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
            style={{ width: `${Math.min(100, budgetPercentageUsed)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-bold text-black/70 pt-0.5">
          <span>₹0</span>
          <span>50% (₹{(monthlyBudgetLimit / 2).toLocaleString('en-IN')})</span>
          <span>₹{monthlyBudgetLimit.toLocaleString('en-IN')} Cap</span>
        </div>
      </div>

      {/* Top Spending Categories Pills */}
      {topCategories.length > 0 && (
        <div className="pt-1 border-t-2 border-black/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase text-black/60 tracking-wider">
              Top Spent Categories
            </span>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('/safety')}
                className="text-[11px] font-bold text-[#7C3AED] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Configure All Category Limits →
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {topCategories.map((cat) => (
              <div
                key={cat.category}
                className="bg-white border-2 border-black px-3 py-1.5 rounded neo-shadow-sm flex items-center gap-2 text-xs font-black uppercase"
              >
                <span className="text-black">{cat.category}:</span>
                <span className="text-[#7C3AED]">₹{cat.spentAmount.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-black/50 font-bold">({cat.percentageUsed}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </NeoCard>
  );
};
