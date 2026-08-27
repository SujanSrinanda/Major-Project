import React from 'react';
import { X, ShieldAlert, CheckCircle2, Info, Bell, Trash2 } from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { NeoButton } from './NeoButton';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { alerts, dismissAlert, clearAllAlerts } = useTransactions();

  if (!isOpen) return null;

  const handleAlertClick = (alert: any) => {
    dismissAlert(alert.id);
    if (alert.relatedTransactionId) {
      onNavigate(`/activity/${alert.relatedTransactionId}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#F5F1E8] border-l-2 border-black h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 md:p-6 bg-white border-b-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#FF521B] border border-black rounded-md text-white">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-lg text-black">Security Alerts</h2>
              <p className="text-xs text-black/60 font-medium">Real-time threat log & account updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <button
                onClick={() => clearAllAlerts()}
                className="text-[11px] font-black uppercase tracking-wider text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                title="Dismiss all messages"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-white border border-black rounded-lg neo-shadow-sm hover:bg-black/5 cursor-pointer"
            >
              <X className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white border-2 border-black rounded-lg neo-shadow">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-black text-base">All clear!</p>
              <p className="text-xs text-black/60 mt-1">No security alerts or unread notifications.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className={`p-4 bg-white border-2 border-black rounded-lg neo-shadow transition-all cursor-pointer relative group ${
                  !alert.isRead ? 'border-l-8 border-l-[#FF521B]' : 'opacity-85'
                } hover:bg-amber-50/50`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 font-black text-sm text-black pr-6">
                    {alert.severity === 'critical' || alert.severity === 'high' ? (
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>{alert.title}</span>
                  </div>
                  
                  {/* Dismiss Single Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.id);
                    }}
                    className="p-1 text-black/40 hover:text-red-600 hover:bg-red-100 rounded border border-transparent hover:border-red-300 transition-all cursor-pointer absolute top-2.5 right-2.5"
                    title="Dismiss message"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-black/80 font-medium leading-relaxed pr-2">{alert.message}</p>
                
                <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-bold text-black/70">
                  <span className="text-[10px] font-bold text-black/50">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {alert.actionTaken && ` • ${alert.actionTaken}`}
                  </span>
                  <span className="text-[#FF521B] group-hover:underline">Read & Dismiss →</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t-2 border-black flex items-center justify-between">
          <span className="text-xs font-bold text-black/60">{alerts.length} total active events</span>
          <NeoButton
            variant="secondary"
            size="sm"
            onClick={() => {
              onNavigate('/safety');
              onClose();
            }}
          >
            Open Safety Center
          </NeoButton>
        </div>
      </div>
    </div>
  );
};
