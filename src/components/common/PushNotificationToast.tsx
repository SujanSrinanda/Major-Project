import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, X, ShieldAlert, Sparkles, CheckCircle } from 'lucide-react';
import { pushNotificationService, PushNotificationPayload } from '../../services/pushNotificationService';

export const PushNotificationToast: React.FC = () => {
  const [activeNotification, setActiveNotification] = useState<PushNotificationPayload | null>(null);
  const [permissionRequested, setPermissionRequested] = useState<boolean>(false);
  const [browserPermission, setBrowserPermission] = useState<string>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }

    const unsubscribe = pushNotificationService.subscribe((notification) => {
      setActiveNotification(notification);

      // Auto dismiss after 8 seconds
      const timer = setTimeout(() => {
        setActiveNotification((current) => (current?.id === notification.id ? null : current));
      }, 8000);

      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  const handleEnableWebPush = async () => {
    const granted = await pushNotificationService.requestPermission();
    setPermissionRequested(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  };

  if (!activeNotification) {
    return null;
  }

  const is80PercentWarning = activeNotification.type === 'BUDGET_80_PERCENT_WARNING';

  const containerBg = is80PercentWarning
    ? 'bg-amber-950 text-white border-4 border-black'
    : 'bg-red-950 text-white border-4 border-black';

  const accentBarBg = is80PercentWarning ? 'bg-amber-400' : 'bg-red-500';

  const iconBg = is80PercentWarning
    ? 'bg-amber-500 text-black border-2 border-black'
    : 'bg-red-600 text-white border-2 border-black';

  const badgeStyle = is80PercentWarning
    ? 'text-amber-300 bg-amber-900/80 border-amber-600'
    : 'text-red-300 bg-red-900/60 border-red-700';

  const textBodyStyle = is80PercentWarning ? 'text-amber-100/90' : 'text-red-100/90';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-in slide-in-from-top-5 duration-300 p-2">
      <div className={`${containerBg} p-4 neo-shadow-xl rounded-lg space-y-3 relative overflow-hidden`}>
        {/* Accent Bar */}
        <div className={`absolute top-0 inset-x-0 h-1.5 ${accentBarBg} animate-pulse`} />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`${iconBg} p-2 rounded-lg neo-shadow-sm shrink-0`}>
              {is80PercentWarning ? (
                <AlertTriangle className="w-5 h-5 animate-bounce text-black" />
              ) : (
                <Bell className="w-5 h-5 animate-bounce" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${badgeStyle}`}>
                  {is80PercentWarning ? 'SentinelPush • 80% Budget Warning' : 'SentinelPush • Just Now'}
                </span>
              </div>
              <h4 className="text-base font-black uppercase text-white tracking-tight mt-1">
                {activeNotification.title}
              </h4>
              <p className={`text-xs font-bold ${textBodyStyle} leading-snug mt-1`}>
                {activeNotification.body}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveNotification(null)}
            className="p-1 hover:bg-white/20 rounded transition-colors text-white shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Push Permission Enable Callout if default */}
        {browserPermission === 'default' && !permissionRequested && (
          <div className={`pt-2 border-t ${is80PercentWarning ? 'border-amber-800' : 'border-red-800'} flex items-center justify-between text-xs`}>
            <span className={`text-[11px] font-bold ${is80PercentWarning ? 'text-amber-200' : 'text-red-200'}`}>
              Enable desktop system push notifications?
            </span>
            <button
              type="button"
              onClick={handleEnableWebPush}
              className="px-2.5 py-1 bg-white text-black font-black uppercase text-[10px] border border-black rounded neo-shadow-sm hover:bg-gray-100 cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-[#7C3AED]" />
              Enable Push
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
