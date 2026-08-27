import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Check,
  X,
  PieChart,
  ShoppingBag,
  Utensils,
  Zap,
  Send,
  Film,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { TransactionCategory } from '../../types';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';

const CATEGORY_ICONS: Record<TransactionCategory, React.FC<{ className?: string }>> = {
  'Food & Dining': Utensils,
  'Bills & Utilities': Zap,
  Shopping: ShoppingBag,
  Transfers: Send,
  Entertainment: Film,
  Others: MoreHorizontal,
};

export const MonthlySpendingThresholds: React.FC = () => {
  const { monthlyCategorySummaries, updateCategoryThreshold } = useTransactions();

  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);
  const [tempThresholdValue, setTempThresholdValue] = useState<string>('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalMonthlySpent = monthlyCategorySummaries.reduce((acc, c) => acc + c.spentAmount, 0);
  const exceededCategoriesCount = monthlyCategorySummaries.filter((c) => c.isExceeded).length;

  const handleStartEdit = (cat: TransactionCategory, currentThreshold: number) => {
    setEditingCategory(cat);
    setTempThresholdValue(currentThreshold.toString());
    setErrorMsg(null);
  };

  const handleSaveEdit = async (cat: TransactionCategory) => {
    const val = parseFloat(tempThresholdValue);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Enter a valid positive threshold.');
      return;
    }
    try {
      setSavingCategory(true);
      setErrorMsg(null);
      await updateCategoryThreshold(cat, val);
      setEditingCategory(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update category threshold.');
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-black/70 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-[#7C3AED]" />
          <span>Monthly Spending & Category Thresholds</span>
        </h3>

        {exceededCategoriesCount > 0 ? (
          <span className="text-xs font-black text-red-950 bg-red-100 border border-red-800 px-2.5 py-1 rounded flex items-center gap-1.5 self-start sm:self-auto animate-pulse">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            {exceededCategoriesCount} CATEGORY THRESHOLD EXCEEDED
          </span>
        ) : (
          <span className="text-xs font-black text-emerald-900 bg-emerald-100 border border-emerald-700 px-2.5 py-1 rounded flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ALL CATEGORIES WITHIN THRESHOLD
          </span>
        )}
      </div>

      <NeoCard className="p-5 md:p-6 bg-white space-y-6">
        {/* Total Monthly Spend Overview */}
        <div className="bg-[#FAF7F2] border-2 border-black p-4 neo-shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase text-black/60 tracking-wider">
              Total Current Month Spending
            </span>
            <div className="text-2xl md:text-3xl font-black text-black tracking-tight">
              ₹{totalMonthlySpent.toLocaleString('en-IN')}
            </div>
            <p className="text-xs font-bold text-black/70 mt-0.5">
              Automated SentinelFin AI budget monitor is calculating real-time safety envelope thresholds.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                // Lower Shopping limit to ₹8,000 to demonstrate triggering warning alert
                updateCategoryThreshold('Shopping', 8000);
              }}
              className="text-xs font-extrabold uppercase bg-purple-100 text-[#7C3AED] hover:bg-purple-200 border-2 border-black px-3 py-1.5 rounded neo-shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Demo: Lower Shopping Limit (₹8k)
            </button>
          </div>
        </div>

        {/* Category Spending List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monthlyCategorySummaries.map((summary) => {
            const IconComponent = CATEGORY_ICONS[summary.category] || MoreHorizontal;
            const isEditing = editingCategory === summary.category;

            let badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-700';
            let badgeText = 'ON TRACK';
            let progressColor = 'bg-[#7C3AED]';

            if (summary.isExceeded) {
              badgeColor = 'bg-red-100 text-red-950 border-red-800 font-black animate-pulse';
              badgeText = 'EXCEEDED';
              progressColor = 'bg-red-600';
            } else if (summary.percentageUsed >= 80) {
              badgeColor = 'bg-amber-100 text-amber-950 border-amber-700';
              badgeText = 'NEAR LIMIT';
              progressColor = 'bg-amber-500';
            }

            return (
              <div
                key={summary.category}
                className={`border-2 border-black p-4 neo-shadow-sm transition-all bg-white ${
                  summary.isExceeded ? 'ring-2 ring-red-500 bg-red-50/30' : ''
                }`}
              >
                {/* Category Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-100 border border-black rounded text-[#7C3AED]">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-sm uppercase text-black block leading-tight">
                        {summary.category}
                      </span>
                      <span className="text-[11px] font-bold text-black/60">
                        {summary.transactionCount} transaction{summary.transactionCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 border rounded ${badgeColor}`}>
                    {badgeText}
                  </span>
                </div>

                {/* Amount Spending vs Limit */}
                <div className="my-3 flex items-baseline justify-between text-xs">
                  <div>
                    <span className="font-black text-base text-black">
                      ₹{summary.spentAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-black/60 font-bold ml-1">spent</span>
                  </div>

                  <div className="text-right">
                    {isEditing ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold">₹</span>
                          <input
                            type="number"
                            value={tempThresholdValue}
                            disabled={savingCategory}
                            onChange={(e) => setTempThresholdValue(e.target.value)}
                            className="w-20 p-1 border border-black text-xs font-black rounded disabled:opacity-50"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(summary.category)}
                            disabled={savingCategory}
                            className="p-1 bg-emerald-600 text-white border border-black rounded hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(null);
                              setErrorMsg(null);
                            }}
                            disabled={savingCategory}
                            className="p-1 bg-gray-300 text-black border border-black rounded hover:bg-gray-400 disabled:opacity-50 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {errorMsg && (
                          <span className="text-[10px] font-bold text-red-600">{errorMsg}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-black/60 font-bold">Limit:</span>
                        <span className="font-black text-black">
                          ₹{summary.thresholdAmount.toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(summary.category, summary.thresholdAmount)}
                          title="Edit Threshold"
                          className="p-0.5 text-black/60 hover:text-[#7C3AED] transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 border border-black h-3.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                      style={{ width: `${Math.min(100, summary.percentageUsed)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-black/60">
                    <span>{summary.percentageUsed}% used</span>
                    <span>
                      {summary.isExceeded
                        ? `₹${(summary.spentAmount - summary.thresholdAmount).toLocaleString('en-IN')} over limit`
                        : `₹${(summary.thresholdAmount - summary.spentAmount).toLocaleString('en-IN')} remaining`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </NeoCard>
    </div>
  );
};
