import React from 'react';
import { ArrowLeft, ShieldCheck, ShieldAlert, Cpu, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { NeoButton } from '../common/NeoButton';
import { NeoBadge } from '../common/NeoBadge';

interface TransactionDetailProps {
  transactionId: string;
  onNavigate: (route: string) => void;
}

export const TransactionDetail: React.FC<TransactionDetailProps> = ({
  transactionId,
  onNavigate,
}) => {
  const { transactions, loading } = useTransactions();
  const tx = transactions.find((t) => t.id === transactionId);

  if (loading && !tx) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-black/10 rounded" />
        <div className="bg-white border-2 border-black p-6 neo-shadow space-y-6">
          <div className="h-20 bg-black/10 rounded" />
          <div className="h-32 bg-black/10 rounded" />
          <div className="h-48 bg-black/10 rounded" />
        </div>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="bg-white border-2 border-black p-8 text-center neo-shadow space-y-4 max-w-lg mx-auto">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-black text-black">Transaction Not Found</h2>
        <p className="text-xs font-semibold text-black/70">
          The requested payment record could not be retrieved from the local audit ledger.
        </p>
        <NeoButton variant="primary" onClick={() => onNavigate('/activity')}>
          ← Back to Activity
        </NeoButton>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Bar */}
      <button
        onClick={() => onNavigate('/activity')}
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black hover:text-[#7C3AED] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Activity Log</span>
      </button>

      {/* Primary Card */}
      <div className="bg-white border-2 border-black p-6 neo-shadow space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-black pb-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 border-2 border-black font-black flex items-center justify-center text-2xl shrink-0 ${
                tx.status === 'BLOCKED'
                  ? 'bg-red-600 text-white'
                  : tx.status === 'CHALLENGED'
                  ? 'bg-amber-400 text-black'
                  : 'bg-[#7C3AED] text-white'
              }`}
            >
              {tx.recipientName.charAt(0)}
            </div>
            <div>
              <span className="text-xs font-black uppercase text-[#7C3AED]">
                {tx.type} Payment Detail
              </span>
              <h1 className="text-2xl font-black text-black uppercase tracking-tight">
                {tx.recipientName}
              </h1>
              <p className="text-xs text-black/60 font-semibold">{tx.recipientPhone}</p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-black uppercase text-black/60 block">Amount Evaluated</span>
            <span className="text-3xl font-black text-black">
              ₹{tx.amount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Security Assessment Decision */}
        <div className="bg-[#F5F1E8] border-2 border-black p-5 neo-shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-black/70">
              Sentinel AI Verdict
            </span>
            <NeoBadge
              status={tx.status}
              decision={tx.decision}
              safetyScore={tx.safetyScore}
            />
          </div>

          <p className="font-bold text-sm text-black">{tx.userMessage}</p>

          <div className="flex items-center gap-2 text-xs font-semibold text-black/70 border-t border-black/20 pt-2">
            <span>Timestamp: {new Date(tx.timestamp).toLocaleString()}</span>
            <span>•</span>
            <span>Ref ID: {tx.id}</span>
          </div>
        </div>

        {/* Human Readable Reasons */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-black/70 mb-2">
            Key Safety Factor Analysis
          </h3>
          <div className="space-y-2">
            {tx.reasons.map((r, i) => (
              <div
                key={i}
                className="bg-white border border-black p-3 rounded text-xs font-bold text-black flex items-start gap-2"
              >
                <span className="text-[#7C3AED] font-black">✓</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Risk Fusion Scores & SHAP */}
        {tx.technicalDetails && (
          <div className="bg-purple-50 border-2 border-purple-900 p-5 rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-900" />
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-950">
                Machine Learning & Graph Risk Fusion Diagnostics
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-purple-300 p-3 rounded">
                <span className="text-[10px] font-black uppercase text-black/60 block">Random Forest</span>
                <span className="text-base font-black text-purple-950">{tx.technicalDetails.rfScore}</span>
              </div>
              <div className="bg-white border border-purple-300 p-3 rounded">
                <span className="text-[10px] font-black uppercase text-black/60 block">Isolation Forest</span>
                <span className="text-base font-black text-purple-950">{tx.technicalDetails.ifScore}</span>
              </div>
              <div className="bg-white border border-purple-300 p-3 rounded">
                <span className="text-[10px] font-black uppercase text-black/60 block">Knowledge Graph Risk</span>
                <span className="text-base font-black text-purple-950">{tx.technicalDetails.graphRisk}</span>
              </div>
            </div>

            {/* SHAP Feature Contribution Bars */}
            <div>
              <span className="text-xs font-black uppercase text-purple-950 block mb-2">
                SHAP Feature Weight Contributions
              </span>
              <div className="space-y-2">
                {tx.technicalDetails.shapFactors.map((sf, idx) => (
                  <div key={idx} className="bg-white border border-purple-200 p-2 rounded text-xs font-bold">
                    <div className="flex justify-between text-[11px] mb-1 text-black">
                      <span>{sf.factor}</span>
                      <span className="text-purple-900 font-mono">{sf.impact}</span>
                    </div>
                    <div className="w-full bg-purple-100 h-2 rounded overflow-hidden">
                      <div
                        className="bg-[#7C3AED] h-full"
                        style={{
                          width: `${Math.min(100, Math.max(15, Math.abs(sf.score * 100)))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3">
          <NeoButton
            variant="secondary"
            onClick={() => onNavigate('/pay')}
            className="w-full sm:w-auto uppercase"
          >
            Send Another Payment
          </NeoButton>

          <NeoButton
            variant="primary"
            onClick={() => onNavigate(`/insights?transaction=${tx.id}`)}
            className="w-full sm:w-auto uppercase"
          >
            Inspect Technical Intelligence →
          </NeoButton>
        </div>
      </div>
    </div>
  );
};
