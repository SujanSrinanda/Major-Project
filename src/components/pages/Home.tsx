import React from 'react';
import { Send, QrCode, ShieldCheck, ArrowRight, AlertTriangle, Users, History, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../context/TransactionContext';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';
import { NeoBadge } from '../common/NeoBadge';
import { MonthlyBudgetVisualizer } from '../home/MonthlyBudgetVisualizer';

interface HomeProps {
  onNavigate: (route: string) => void;
  onOpenQR: () => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, onOpenQR }) => {
  const { user, profile } = useAuth();
  const { transactions, alerts, contacts, loading, error, refreshData } = useTransactions();

  const recentTransactions = transactions.slice(0, 4);
  const criticalAlert = alerts.find((a) => !a.isRead && (a.severity === 'critical' || a.severity === 'high'));
  const safetyScore = profile?.safetyScore ?? 100;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* Error notification banner if API loading fails */}
      {error && (
        <div className="bg-red-50 border-2 border-red-800 text-red-950 p-4 neo-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
            <span className="text-xs font-bold">{error}</span>
          </div>
          <button
            onClick={() => refreshData()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white border border-black rounded text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Critical Security Banner if active threat stopped */}
      {criticalAlert && (
        <div className="bg-[#1A1A1A] text-white border-2 border-black p-4 md:p-6 neo-shadow-purple flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-[#FF521B] border border-white rounded-lg text-white shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
                Security Alert Blocked
              </span>
              <h3 className="text-base md:text-lg font-black text-white leading-tight">
                {criticalAlert.title}
              </h3>
              <p className="text-xs md:text-sm text-gray-300 font-medium mt-1">
                {criticalAlert.message}
              </p>
            </div>
          </div>
          <NeoButton
            variant="secondary"
            size="sm"
            className="w-full md:w-auto shrink-0 uppercase"
            onClick={() => onNavigate('/safety')}
          >
            Review Threat →
          </NeoButton>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="flex flex-col lg:flex-row items-stretch gap-6">
        {/* Main Greeting & Pay Action */}
        <div className="flex-1 space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#7C3AED]">
              Protected Account Overview
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-black leading-[0.95] tracking-tighter mt-1 uppercase">
              GOOD {new Date().getHours() < 12 ? 'MORNING' : new Date().getHours() < 18 ? 'AFTERNOON' : 'EVENING'},<br />
              <span className="text-[#7C3AED]">
                {user?.fullName?.split(' ')[0] || profile?.name?.split(' ')[0] || 'USER'}.
              </span>
            </h1>
            <p className="text-base md:text-xl font-semibold text-black/70 mt-3 max-w-xl">
              Your money is protected by SentinelFin's real-time threat detection layer.
            </p>
          </div>

          {/* Large Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <button
              onClick={() => onNavigate('/pay')}
              className="sm:col-span-2 bg-[#7C3AED] text-white border-2 border-black p-5 md:p-6 neo-shadow hover:neo-shadow-lg active:translate-x-0.5 active:translate-y-0.5 transition-all text-left cursor-pointer group flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] font-black text-white/80">Primary Payment</span>
                <Send className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
              </div>
              <div>
                <span className="text-3xl md:text-4xl font-black tracking-tighter block group-hover:underline">
                  PAY NOW →
                </span>
                <span className="text-xs font-bold text-white/80 mt-0.5 block">
                  Scan QR, UPI, Phone or Contact
                </span>
              </div>
            </button>

            <button
              onClick={onOpenQR}
              className="bg-white text-black border-2 border-black p-5 md:p-6 neo-shadow hover:neo-shadow-lg active:translate-x-0.5 active:translate-y-0.5 transition-all flex flex-col items-center justify-center text-center cursor-pointer h-36 group"
            >
              <div className="w-12 h-12 border-2 border-black rounded-lg bg-[#F5F1E8] mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                <QrCode className="w-6 h-6 text-black" />
              </div>
              <span className="font-black uppercase text-xs tracking-wider">Scan QR Code</span>
              <span className="text-[10px] text-black/60 font-semibold mt-0.5">Camera Scanner</span>
            </button>
          </div>
        </div>

        {/* Global Safety Score Card */}
        <div className="lg:w-80 bg-white border-2 border-black p-6 neo-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-[0.15em] text-black/60">
                Safety Index
              </span>
              <span className="text-xs font-bold text-[#7C3AED] bg-purple-100 border border-purple-800 px-2 py-0.5 rounded">
                Active Layer
              </span>
            </div>

            {/* Dial gauge indicator */}
            <div className="relative flex items-center justify-center my-4">
              <div className="w-36 h-36 rounded-full border-4 border-black flex items-center justify-center bg-[#F5F1E8] neo-shadow-sm">
                <div className="text-center">
                  <span className="text-5xl font-black tracking-tighter text-black block">
                    {safetyScore}
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-widest text-emerald-700 block">
                    ✓ SECURE
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-black pt-4">
            <p className="text-xs font-medium italic text-black/80 leading-relaxed">
              "Your payment behavior is verified against SQLite ledger state. Real-time threat detection active."
            </p>
            <button
              onClick={() => onNavigate('/safety')}
              className="text-xs font-black uppercase text-[#7C3AED] hover:underline mt-2 inline-flex items-center gap-1 cursor-pointer"
            >
              View Safety Metrics →
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Budget Cap Progress Visualizer */}
      <MonthlyBudgetVisualizer onNavigate={onNavigate} />

      {/* Quick Recipient Bar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-black/70 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#7C3AED]" />
            <span>Frequent Contacts</span>
          </h3>
          <button
            onClick={() => onNavigate('/contacts')}
            className="text-xs font-bold text-[#7C3AED] hover:underline cursor-pointer"
          >
            Manage Contacts ({contacts.length}) →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white border-2 border-black p-3 neo-shadow animate-pulse h-16" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="bg-white border-2 border-black p-5 text-center neo-shadow flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs font-bold text-black/60">
              No frequent contacts added yet. Add recipients for quick one-tap verification.
            </p>
            <NeoButton
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('/contacts')}
              className="uppercase text-xs shrink-0"
            >
              + Add Contact
            </NeoButton>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {contacts.slice(0, 5).map((contact) => (
              <div
                key={contact.id}
                onClick={() => onNavigate(`/pay?phone=${encodeURIComponent(contact.phone)}`)}
                className="bg-white border-2 border-black p-3 neo-shadow hover:neo-shadow-lg active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-3 group"
              >
                <div className="w-10 h-10 bg-[#7C3AED] text-white border border-black rounded-full flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition-transform">
                  {contact.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-black truncate">{contact.name}</p>
                  <p className="text-[10px] text-black/60 font-semibold truncate">{contact.phone}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-black/70 flex items-center gap-2">
            <History className="w-4 h-4 text-[#7C3AED]" />
            <span>Recent Payment Activity</span>
          </h3>
          <button
            onClick={() => onNavigate('/activity')}
            className="text-xs font-bold text-[#7C3AED] hover:underline cursor-pointer"
          >
            View All ({transactions.length}) →
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border-2 border-black p-4 neo-shadow animate-pulse h-20" />
            ))}
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="bg-white border-2 border-black p-8 text-center neo-shadow space-y-3">
            <p className="font-bold text-black/70 text-sm">
              No transactions recorded yet in your account.
            </p>
            <p className="text-xs text-black/50 font-medium max-w-md mx-auto">
              Initiate your first transfer or scan a QR code to experience real-time behavioral protection.
            </p>
            <NeoButton
              variant="primary"
              size="sm"
              onClick={() => onNavigate('/pay')}
              className="uppercase"
            >
              Make First Payment →
            </NeoButton>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => onNavigate(`/activity/${tx.id}`)}
                className="bg-white border-2 border-black p-4 neo-shadow hover:neo-shadow-lg transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 border-2 border-black font-black flex items-center justify-center text-base shrink-0 ${
                      tx.status === 'BLOCKED'
                        ? 'bg-red-500 text-white'
                        : tx.status === 'CHALLENGED'
                        ? 'bg-amber-400 text-black'
                        : 'bg-[#7C3AED] text-white'
                    }`}
                  >
                    {tx.recipientName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-black">{tx.recipientName}</p>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 bg-black/5 border border-black/20 rounded">
                        {tx.type}
                      </span>
                    </div>
                    <p className="text-xs text-black/60 font-medium">
                      {new Date(tx.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-black/10">
                  <div className="text-left sm:text-right">
                    <p className="font-black text-base text-black">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </p>
                    <NeoBadge
                      status={tx.status}
                      decision={tx.decision}
                      safetyScore={tx.safetyScore}
                    />
                  </div>
                  <ArrowRight className="w-5 h-5 text-black/40 hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
