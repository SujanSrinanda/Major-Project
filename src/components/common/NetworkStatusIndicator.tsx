import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff, CloudCheck, AlertCircle } from 'lucide-react';

export const NetworkStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!simulatedOffline) {
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 2000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [simulatedOffline]);

  const effectiveOnline = isOnline && !simulatedOffline;

  const toggleSimulatedOffline = () => {
    if (simulatedOffline) {
      // Reconnecting
      setSimulatedOffline(false);
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 2000);
    } else {
      setSimulatedOffline(true);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={toggleSimulatedOffline}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-black rounded-lg text-xs font-black neo-shadow-sm transition-all cursor-pointer ${
          !effectiveOnline
            ? 'bg-amber-100 text-amber-950 border-amber-900 animate-pulse'
            : isSyncing
            ? 'bg-blue-100 text-blue-900 border-blue-800'
            : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100'
        }`}
        title={
          !effectiveOnline
            ? 'Offline Mode: Transaction data is queued and waiting to sync'
            : 'Online: Click to test simulated offline sync'
        }
      >
        {!effectiveOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="hidden lg:inline text-[11px] uppercase tracking-wide">
              Offline • Queued
            </span>
            <span className="lg:hidden text-[10px] uppercase">Offline</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-700 animate-spin shrink-0" />
            <span className="hidden lg:inline text-[11px] uppercase tracking-wide">
              Syncing...
            </span>
            <span className="lg:hidden text-[10px] uppercase">Sync</span>
          </>
        ) : (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden lg:inline text-[11px] uppercase tracking-wide">
              Online
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </>
        )}
      </button>

      {/* Tooltip detail callout */}
      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 p-3 bg-white border-2 border-black neo-shadow-lg rounded-lg text-left text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 mb-1">
            {!effectiveOnline ? (
              <CloudOff className="w-4 h-4 text-amber-600" />
            ) : (
              <CloudCheck className="w-4 h-4 text-emerald-600" />
            )}
            <span className="font-black text-black uppercase">
              {!effectiveOnline ? 'Offline Queue Active' : 'Network Synchronized'}
            </span>
          </div>

          <p className="text-[11px] font-bold text-black/70 leading-snug">
            {!effectiveOnline
              ? 'Your device is disconnected from the network. Payments will be held securely in local queue & synced when online.'
              : 'All risk evaluations and payments are synced with SentinelFin cloud security layer in real time.'}
          </p>

          <div className="mt-2 pt-2 border-t border-black/10 flex justify-between items-center text-[10px] font-extrabold text-black/60">
            <span>Status: {!effectiveOnline ? 'OFFLINE (Queued)' : 'ONLINE'}</span>
            <span className="text-[#7C3AED] hover:underline cursor-pointer">
              {simulatedOffline ? 'Restore Connection' : 'Test Offline Mode'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
