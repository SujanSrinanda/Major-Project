import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  Zap,
  TrendingUp,
  RotateCcw,
  Clock,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { Transaction, RecurringPatternFlag } from '../../types';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';

interface HighRiskPatternFlagListProps {
  onInspectTransaction?: (tx: Transaction) => void;
}

export const HighRiskPatternFlagList: React.FC<HighRiskPatternFlagListProps> = ({
  onInspectTransaction,
}) => {
  const { highRiskFlaggedTransactions, flaggedPatternCount, setActiveTransaction } = useTransactions();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const filteredTransactions = highRiskFlaggedTransactions.filter((tx) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'STRUCTURING')
      return tx.highRiskPatternFlag?.patternType === 'SPLIT_STRUCTURING';
    if (filterType === 'BURST')
      return tx.highRiskPatternFlag?.patternType === 'RAPID_BURST';
    if (filterType === 'ANOMALY')
      return (
        tx.highRiskPatternFlag?.patternType === 'RECURRING_ANOMALY' ||
        tx.highRiskPatternFlag?.patternType === 'VELOCITY_SPIKE'
      );
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedTxId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <h3 className="text-xs font-black uppercase tracking-widest text-black/80">
            Automated High-Risk Pattern Flags ({flaggedPatternCount})
          </h3>
        </div>

        {/* Pattern Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-black/50 uppercase mr-1">Filter:</span>
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`text-[10px] font-black uppercase px-2.5 py-1 border border-black rounded transition-all cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-[#7C3AED] text-white neo-shadow-sm'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            All ({flaggedPatternCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('BURST')}
            className={`text-[10px] font-black uppercase px-2.5 py-1 border border-black rounded transition-all cursor-pointer ${
              filterType === 'BURST'
                ? 'bg-red-600 text-white neo-shadow-sm'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            Rapid Velocity Burst
          </button>
          <button
            type="button"
            onClick={() => setFilterType('STRUCTURING')}
            className={`text-[10px] font-black uppercase px-2.5 py-1 border border-black rounded transition-all cursor-pointer ${
              filterType === 'STRUCTURING'
                ? 'bg-amber-500 text-black neo-shadow-sm'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            Structuring
          </button>
        </div>
      </div>

      {flaggedPatternCount === 0 ? (
        <NeoCard className="p-6 text-center bg-emerald-50/60 border-2 border-emerald-800 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h4 className="text-base font-black text-emerald-950 uppercase">
            No Suspicious Recurring Patterns Detected
          </h4>
          <p className="text-xs text-emerald-900/80 font-medium max-w-md mx-auto">
            SentinelFin pattern engine analyzed recent velocity, transaction bursts, and smurfing indicators. All transaction streams are operating normally.
          </p>
        </NeoCard>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => {
            const flag = tx.highRiskPatternFlag;
            const isExpanded = expandedTxId === tx.id;
            const isCritical = flag?.severity === 'CRITICAL' || tx.riskLevel === 'CRITICAL';

            return (
              <div
                key={tx.id}
                className={`border-2 border-black p-4 neo-shadow-md transition-all rounded-lg bg-white ${
                  isCritical ? 'ring-2 ring-red-500 bg-red-50/40' : 'hover:border-[#7C3AED]'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-lg border-2 border-black text-white shrink-0 neo-shadow-sm ${
                        isCritical ? 'bg-red-600' : 'bg-amber-500 text-black'
                      }`}
                    >
                      <AlertOctagon className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black ${
                            isCritical ? 'bg-red-600 text-white' : 'bg-amber-400 text-black'
                          }`}
                        >
                          {flag?.label || `High-Risk Pattern (${tx.riskLevel})`}
                        </span>

                        <span className="text-[10px] font-bold text-black/60 bg-gray-100 border border-black/20 px-2 py-0.5 rounded">
                          {tx.type} • {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-black uppercase tracking-tight mt-1 flex items-center gap-2">
                        <span>{tx.recipientName}</span>
                        <span className="text-xs font-mono text-black/60 font-bold">({tx.recipientPhone})</span>
                      </h4>
                    </div>
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-black/10">
                    <div className="text-left md:text-right">
                      <span className="text-lg md:text-xl font-black text-black block tracking-tight">
                        ₹{tx.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] font-bold text-black/60 uppercase">
                        Status: {tx.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTransaction(tx);
                          if (onInspectTransaction) onInspectTransaction(tx);
                        }}
                        className="px-3 py-1.5 bg-[#7C3AED] text-white border-2 border-black text-xs font-black uppercase rounded neo-shadow-sm hover:bg-purple-700 transition-all cursor-pointer flex items-center gap-1"
                      >
                        Inspect
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(tx.id)}
                        className="p-1.5 bg-gray-100 border-2 border-black rounded text-black hover:bg-gray-200 cursor-pointer"
                        title="Toggle Analysis Details"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pattern Explanation Banner */}
                {flag?.reason && (
                  <div className="mt-3 p-3 bg-red-100/80 border-2 border-red-800 rounded text-xs font-bold text-red-950 flex items-start gap-2">
                    <Info className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black uppercase tracking-wider block text-[10px] text-red-800">
                        Pattern Signal Trigger
                      </span>
                      <p className="mt-0.5 leading-snug">{flag.reason}</p>
                    </div>
                  </div>
                )}

                {/* Expandable Technical Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t-2 border-black/10 text-xs space-y-2 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#FAF7F2] p-3 border border-black rounded">
                      <div>
                        <span className="text-[10px] font-black uppercase text-black/60 block">
                          Detection Algorithm
                        </span>
                        <span className="font-bold text-black">
                          SentinelFin Recurring Velocity Engine v2
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-black/60 block">
                          Detected Timestamp
                        </span>
                        <span className="font-bold text-black">
                          {new Date(flag?.detectedAt || tx.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {tx.reasons && tx.reasons.length > 0 && (
                      <div>
                        <span className="text-[10px] font-black uppercase text-black/60 block mb-1">
                          Risk Engine Explanations
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-black/80 font-medium">
                          {tx.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
