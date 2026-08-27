import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Smartphone, Check, Sliders, Bell, AlertTriangle, Cpu, Trash2, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../context/TransactionContext';
import { userApi, TrustedDevice } from '../../services/api';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';
import { MonthlySpendingThresholds } from '../safety/MonthlySpendingThresholds';
import { HighRiskPatternFlagList } from '../safety/HighRiskPatternFlagList';

interface SafetyCenterProps {
  onNavigate: (route: string) => void;
}

export const SafetyCenter: React.FC<SafetyCenterProps> = ({ onNavigate }) => {
  const { profile, updateProtectionLevel } = useAuth();
  const { alerts, dismissAlert } = useTransactions();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  const fetchDevices = async () => {
    try {
      setLoadingDevices(true);
      const data = await userApi.getDevices();
      setDevices(data || []);
    } catch (e) {
      // Fetch error
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevokeDevice = async (id: string) => {
    try {
      await userApi.removeDevice(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      // Remove error
    }
  };

  const getNormalizedLevel = (lvl?: string) => {
    if (!lvl) return 'HIGH';
    const upper = lvl.toUpperCase();
    if (upper.includes('BALANC')) return 'BALANCED';
    if (upper.includes('STRICT')) return 'STRICT';
    return 'HIGH';
  };

  const currentLevel = getNormalizedLevel(profile?.protectionLevel);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      <div>
        <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">
          Protection Control Panel
        </span>
        <h1 className="text-3xl md:text-5xl font-black text-black leading-tight uppercase tracking-tighter">
          Financial Safety Center
        </h1>
        <p className="text-sm font-semibold text-black/70 mt-1">
          Configure risk threshold strictness, manage active threat alerts, and review trusted mobile devices.
        </p>
      </div>

      {/* Safety Score Meter Banner */}
      <div className="bg-[#1A1A1A] text-white border-2 border-black p-6 neo-shadow-purple flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-[#7C3AED] border-2 border-white rounded-full flex items-center justify-center font-black text-2xl shrink-0 neo-shadow">
            {profile?.safetyScore !== undefined && profile?.safetyScore !== null ? profile.safetyScore : 'N/A'}
          </div>
          <div>
            <span className="text-xs font-black uppercase text-[#7C3AED] tracking-widest">
              Account Security Status
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">
              {currentLevel} SENSITIVITY
            </h2>
            <p className="text-xs text-gray-300 font-medium mt-1 max-w-md">
              Security risk policies and real-time transaction guardrails enforced by server core.
            </p>
          </div>
        </div>

        <NeoButton
          variant="secondary"
          size="sm"
          className="uppercase w-full md:w-auto"
          onClick={() => onNavigate('/admin')}
        >
          View Model Weights →
        </NeoButton>
      </div>

      {/* Protection Sensitivity Levels */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-black/70 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#7C3AED]" />
          <span>Protection Sensitivity Level</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Balanced */}
          <div
            onClick={() => updateProtectionLevel('BALANCED')}
            className={`border-2 border-black p-5 cursor-pointer transition-all flex flex-col justify-between ${
              currentLevel === 'BALANCED'
                ? 'bg-white neo-shadow-xl ring-2 ring-[#7C3AED]'
                : 'bg-white/60 neo-shadow hover:bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-black text-base uppercase text-black">Balanced</span>
                {currentLevel === 'BALANCED' && (
                  <span className="bg-[#7C3AED] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-black/70 font-semibold leading-relaxed">
                Standard AI threat filtering. Blocks obvious scams and zero-day threat patterns while keeping low friction for daily payments.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/10 text-[11px] font-bold text-black/60">
              Recommended for everyday usage
            </div>
          </div>

          {/* High Protection */}
          <div
            onClick={() => updateProtectionLevel('HIGH')}
            className={`border-2 border-black p-5 cursor-pointer transition-all flex flex-col justify-between ${
              currentLevel === 'HIGH'
                ? 'bg-white neo-shadow-xl ring-2 ring-[#7C3AED]'
                : 'bg-white/60 neo-shadow hover:bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-black text-base uppercase text-black">High Protection</span>
                {currentLevel === 'HIGH' && (
                  <span className="bg-[#7C3AED] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-black/70 font-semibold leading-relaxed">
                Enhanced verification for transactions over ₹5,000 to new recipients or unverified VPAs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/10 text-[11px] font-bold text-black/60">
              Ideal for active online shoppers
            </div>
          </div>

          {/* Strict Lockdown */}
          <div
            onClick={() => updateProtectionLevel('STRICT')}
            className={`border-2 border-black p-5 cursor-pointer transition-all flex flex-col justify-between ${
              currentLevel === 'STRICT'
                ? 'bg-white neo-shadow-xl ring-2 ring-[#7C3AED]'
                : 'bg-white/60 neo-shadow hover:bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-black text-base uppercase text-black">Strict Lockdown</span>
                {currentLevel === 'STRICT' && (
                  <span className="bg-[#7C3AED] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-black/70 font-semibold leading-relaxed">
                Strict multi-factor challenge required for any transaction to unknown recipients regardless of amount.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/10 text-[11px] font-bold text-black/60">
              Maximum fraud defense
            </div>
          </div>
        </div>
      </div>

      {/* High-Risk Pattern Flags Section */}
      <HighRiskPatternFlagList />

      {/* Advanced AI & Risk Engine Banner */}
      <div className="bg-[#1A1A1A] text-white border-2 border-black p-5 neo-shadow-purple rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-[#7C3AED] text-white border-2 border-black rounded-lg shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-base uppercase text-white tracking-tight">
              Advanced Sentinel Intelligence Engine
            </h4>
            <p className="text-xs text-gray-300 font-medium mt-0.5 max-w-xl">
              Inspect model fusion pipelines, Random Forest feature weights, Isolation Forest anomaly rates, Neo4j graph topologies, and SHAP explainability.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/insights')}
          className="px-4 py-2.5 bg-[#7C3AED] hover:bg-purple-600 text-white border-2 border-black rounded-lg text-xs font-black uppercase neo-shadow cursor-pointer transition-all self-start md:self-auto shrink-0 flex items-center gap-2"
        >
          <span>Open Sentinel Intelligence</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Monthly Category Spending & Thresholds Service */}
      <MonthlySpendingThresholds />

      {/* Active Threats & Alerts List */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-black/70 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#7C3AED]" />
          <span>Security Threat Alerts ({alerts.length})</span>
        </h3>

        {alerts.length === 0 ? (
          <div className="bg-white border-2 border-black p-6 text-center neo-shadow">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-bold text-sm text-black">No active security alerts</p>
            <p className="text-xs text-black/60 font-medium mt-1">All real-time threat detection systems are active and nominal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((al) => (
              <div
                key={al.id}
                className={`border-2 border-black p-4 neo-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  al.severity === 'critical' || al.severity === 'high' ? 'bg-red-50' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded border border-black text-white shrink-0 mt-0.5 ${
                      al.severity === 'critical'
                        ? 'bg-red-600'
                        : al.severity === 'high'
                        ? 'bg-amber-500 text-black'
                        : 'bg-[#7C3AED]'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm text-black">{al.title}</p>
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.2 bg-black/10 border border-black/30 rounded">
                        {al.severity}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-black/70 mt-0.5">{al.message}</p>
                    <span className="text-[10px] text-black/50 font-medium">
                      {new Date(al.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <NeoButton
                  variant="secondary"
                  size="sm"
                  onClick={() => dismissAlert(al.id)}
                  className="shrink-0 uppercase"
                >
                  Acknowledge & Dismiss
                </NeoButton>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trusted Devices Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-black/70 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[#7C3AED]" />
          <span>Registered Hardware & Session Devices ({devices.length})</span>
        </h3>

        {loadingDevices ? (
          <div className="p-4 bg-white border-2 border-black text-xs font-bold text-black/60">
            Loading device security inventory...
          </div>
        ) : devices.length === 0 ? (
          <div className="p-4 bg-white border-2 border-black text-xs font-bold text-black/60">
            No registered session devices found.
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((dev) => (
              <div
                key={dev.id}
                className="bg-white border-2 border-black p-4 neo-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-[#7C3AED] text-white border border-black rounded-lg shrink-0 mt-0.5">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm text-black">{dev.name}</p>
                      {dev.isCurrent ? (
                        <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Current Device
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-gray-700 bg-gray-100 border border-gray-400 px-2 py-0.5 rounded">
                          Trusted Secondary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-black/60 font-semibold mt-0.5">
                      {dev.browser} • Last active {new Date(dev.lastActive).toLocaleTimeString()} • {dev.location || 'Location unavailable'}
                    </p>
                  </div>
                </div>

                {!dev.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeDevice(dev.id)}
                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-black rounded text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Revoke Access
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
