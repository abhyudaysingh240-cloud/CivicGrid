import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, ZapOff, Wifi, Clock, Activity } from 'lucide-react';

type StatusType = 'HEALTHY' | 'WARNING' | 'FAULTED' | 'ISOLATED' | 'RESTORED' | 'RESOLVED' | 'OPEN' | 'CRITICAL' | 'NORMAL' | 'SUBMITTED' | 'VERIFIED' | 'IN_PROGRESS' | 'REJECTED' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SITE' | 'COMPLETED' | 'OPERATIONAL' | 'DEGRADED';

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'xs' | 'sm' | 'md';
  dark?: boolean;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  HEALTHY:      { label: 'Healthy',      className: 'badge-healthy',  icon: <CheckCircle className="w-3 h-3" /> },
  NORMAL:       { label: 'Normal',       className: 'badge-healthy',  icon: <CheckCircle className="w-3 h-3" /> },
  OPERATIONAL:  { label: 'Operational',  className: 'badge-healthy',  icon: <CheckCircle className="w-3 h-3" /> },
  RESTORED:     { label: 'Restored',     className: 'badge-restored', icon: <Activity className="w-3 h-3" /> },
  RESOLVED:     { label: 'Resolved',     className: 'badge-resolved', icon: <CheckCircle className="w-3 h-3" /> },
  COMPLETED:    { label: 'Completed',    className: 'badge-resolved', icon: <CheckCircle className="w-3 h-3" /> },
  WARNING:      { label: 'Warning',      className: 'badge-warning',  icon: <AlertTriangle className="w-3 h-3" /> },
  DEGRADED:     { label: 'Degraded',     className: 'badge-warning',  icon: <AlertTriangle className="w-3 h-3" /> },
  IN_PROGRESS:  { label: 'In Progress',  className: 'badge-warning',  icon: <Clock className="w-3 h-3" /> },
  EN_ROUTE:     { label: 'En Route',     className: 'badge-warning',  icon: <Clock className="w-3 h-3" /> },
  ON_SITE:      { label: 'On Site',      className: 'badge-warning',  icon: <Clock className="w-3 h-3" /> },
  FAULTED:      { label: 'Faulted',      className: 'badge-faulted',  icon: <XCircle className="w-3 h-3" /> },
  CRITICAL:     { label: 'Critical',     className: 'badge-critical', icon: <XCircle className="w-3 h-3" /> },
  RECONFIGURATION_FAILED: { label: 'Reconfig Failed', className: 'badge-critical', icon: <XCircle className="w-3 h-3" /> },
  REJECTED:     { label: 'Rejected',     className: 'badge-critical', icon: <XCircle className="w-3 h-3" /> },
  ISOLATED:     { label: 'Isolated',     className: 'badge-isolated', icon: <ZapOff className="w-3 h-3" /> },
  ISLANDED:     { label: 'Islanded',     className: 'badge-isolated', icon: <ZapOff className="w-3 h-3" /> },
  OPEN:         { label: 'Open',         className: 'badge-open',     icon: <Wifi className="w-3 h-3" /> },
  SUBMITTED:    { label: 'Submitted',    className: 'badge-stone',    icon: <Info className="w-3 h-3" /> },
  VERIFIED:     { label: 'Verified',     className: 'badge-sage',     icon: <CheckCircle className="w-3 h-3" /> },
  ASSIGNED:     { label: 'Assigned',     className: 'badge-sage',     icon: <Clock className="w-3 h-3" /> },
  ANALYZING:    { label: 'Analyzing',    className: 'badge-warning',  icon: <Activity className="w-3 h-3" /> },
  RECONFIGURING:{ label: 'Reconfig.',    className: 'badge-warning',  icon: <Activity className="w-3 h-3" /> },
  FAULT_DETECTED:{ label: 'Fault',       className: 'badge-faulted',  icon: <AlertTriangle className="w-3 h-3" /> },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', dark: _dark = false }) => {
  const cfg = statusConfig[status] ?? { label: status, className: 'badge-stone', icon: <Info className="w-3 h-3" /> };
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5 gap-1' : size === 'md' ? 'text-sm px-3 py-1 gap-1.5' : '';
  return (
    <span className={`badge ${cfg.className} ${sizeClass}`} role="status" aria-label={`Status: ${cfg.label}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};
