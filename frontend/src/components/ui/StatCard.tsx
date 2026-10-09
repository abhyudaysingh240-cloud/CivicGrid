import React from 'react';
import { HelpCircle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  source?: string;
  timestamp?: string;
  onWhy?: () => void;
  dark?: boolean;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, unit, source, timestamp, onWhy, dark = false, trend, trendLabel
}) => {
  const base = dark ? 'stat-card-dark' : 'stat-card';
  const textPrimary = dark ? 'text-[var(--text-dark-primary)]' : 'text-[var(--text-primary)]';
  const textMuted = dark ? 'text-[var(--text-dark-muted)]' : 'text-[var(--text-muted)]';
  const textSec = dark ? 'text-[var(--text-dark-secondary)]' : 'text-[var(--text-secondary)]';

  return (
    <div className={`${base} relative`}>
      <div className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>{label}</div>
      <div className={`flex items-end gap-1.5 mt-1`}>
        <span className={`text-2xl font-bold font-mono ${textPrimary}`}>{value}</span>
        {unit && <span className={`text-sm mb-0.5 ${textSec}`}>{unit}</span>}
        {trend && (
          <span className={`text-xs mb-0.5 font-semibold ml-1 ${
            trend === 'up' ? 'text-[var(--status-warning)]' : trend === 'down' ? 'text-[var(--status-healthy)]' : textMuted
          }`}>{trendLabel}</span>
        )}
      </div>
      {(source || timestamp) && (
        <div className={`flex items-center gap-2 mt-1.5 ${textMuted} text-[10px] font-mono`}>
          {source && <span>{source}</span>}
          {source && timestamp && <span>·</span>}
          {timestamp && <span>{new Date(timestamp).toLocaleTimeString()}</span>}
        </div>
      )}
      {onWhy && (
        <button
          onClick={onWhy}
          className={`absolute top-3 right-3 p-1 rounded-md hover:bg-opacity-10 transition-colors ${textMuted} hover:text-[var(--coral-strong)]`}
          title="Why this value?"
          aria-label={`Explain ${label}`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
