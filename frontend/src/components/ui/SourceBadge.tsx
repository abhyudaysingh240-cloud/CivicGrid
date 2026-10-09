import React from 'react';

interface SourceBadgeProps {
  source: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source }) => {
  if (source === 'AI_CLASSIFICATION') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
        AI CLASSIFICATION
      </span>
    );
  }

  if (source === 'RULE_BASED_FALLBACK') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
        RULE-BASED FALLBACK
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
      {source || 'UNKNOWN'}
    </span>
  );
};
