import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, RefreshCw, XCircle, Info } from 'lucide-react';

export type StatusType = 
  | 'HEALTHY' 
  | 'WARNING' 
  | 'DEGRADED' 
  | 'FAULTED' 
  | 'CRITICAL' 
  | 'RESTORED' 
  | 'OPEN' 
  | 'UNAVAILABLE' 
  | 'INFO';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const norm = (status || '').toUpperCase();
  const displayLabel = label || norm;

  if (norm === 'HEALTHY' || norm === 'OPERATIONAL' || norm === 'RESOLVED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 shrink-0" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (norm === 'WARNING' || norm === 'IN_PROGRESS') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (norm === 'CRITICAL' || norm === 'FAULTED' || norm === 'RECONFIGURATION_FAILED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/40 ring-1 ring-red-500/20">
        <AlertOctagon className="w-3 h-3 shrink-0" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (norm === 'RESTORED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
        <RefreshCw className="w-3 h-3 shrink-0" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (norm === 'OPEN') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-dashed border-slate-500 text-slate-400">
        <span>{displayLabel} (TIE)</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
      <Info className="w-3 h-3 shrink-0 text-slate-400" />
      <span>{displayLabel}</span>
    </span>
  );
};
