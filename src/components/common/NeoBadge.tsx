import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { RiskDecision, RiskLevel } from '../../types';

interface NeoBadgeProps {
  status?: 'COMPLETED' | 'BLOCKED' | 'PENDING' | 'CHALLENGED' | 'FAILED';
  decision?: RiskDecision;
  riskLevel?: RiskLevel;
  safetyScore?: number;
  className?: string;
  showIcon?: boolean;
}

export const NeoBadge: React.FC<NeoBadgeProps> = ({
  status,
  decision,
  safetyScore,
  className = '',
  showIcon = true,
}) => {
  let bg = 'bg-emerald-100 text-emerald-900 border-emerald-900';
  let label = '✓ Safe';
  let Icon = ShieldCheck;

  if (decision === 'BLOCK' || status === 'BLOCKED') {
    bg = 'bg-red-100 text-red-950 border-red-900';
    label = '⛔ Stopped';
    Icon = ShieldX;
  } else if (decision === 'CHALLENGE' || status === 'CHALLENGED') {
    bg = 'bg-amber-100 text-amber-950 border-amber-900';
    label = '⚠ Security Check';
    Icon = ShieldAlert;
  } else if (safetyScore !== undefined) {
    if (safetyScore >= 85) {
      bg = 'bg-emerald-100 text-emerald-900 border-emerald-900';
      label = `✓ Safe (${safetyScore}/100)`;
      Icon = ShieldCheck;
    } else if (safetyScore >= 60) {
      bg = 'bg-amber-100 text-amber-950 border-amber-900';
      label = `⚠ Review (${safetyScore}/100)`;
      Icon = ShieldAlert;
    } else {
      bg = 'bg-red-100 text-red-950 border-red-900';
      label = `⛔ High Risk (${safetyScore}/100)`;
      Icon = ShieldX;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-black shadow-[2px_2px_0px_#000] whitespace-nowrap ${bg} ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{label}</span>
    </span>
  );
};
