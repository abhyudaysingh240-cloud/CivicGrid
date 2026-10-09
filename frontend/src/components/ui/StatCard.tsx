import React from 'react';
import { HelpCircle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  source?: string;
  timestamp?: string;
  onWhy?: () => void;
  statusVariant?: 'default' | 'warning' | 'critical' | 'success';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  source = 'computed from digital twin',
  timestamp,
  onWhy,
  statusVariant = 'default',
}) => {
  const getValueColor = () => {
    switch (statusVariant) {
      case 'critical':
        return 'text-red-400';
      case 'warning':
        return 'text-amber-400';
      case 'success':
        return 'text-emerald-400';
      default:
        return 'text-slate-100';
    }
  };

  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl p-3.5 space-y-1.5 shadow-md transition-all hover:border-border-strong">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-text-secondary">
        <span>{label}</span>
        {onWhy && (
          <button
            onClick={onWhy}
            title="Inspect calculation rationale"
            className="flex items-center gap-0.5 text-brand-primary hover:text-white transition-colors"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Why?</span>
          </button>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl font-bold font-mono ${getValueColor()}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-text-muted">{unit}</span>}
      </div>

      <div className="pt-1.5 border-t border-border-subtle/60 flex items-center justify-between text-[9px] font-mono text-text-muted">
        <span className="truncate">{source}</span>
        {timestamp && <span>{timestamp}</span>}
      </div>
    </div>
  );
};
