import React from 'react';

type SourceType = 'AI_CLASSIFICATION' | 'RULE_BASED_FALLBACK' | 'IMAGE_NOT_CLASSIFIED' | string;

interface SourceBadgeProps {
  source: SourceType;
  confidence?: number | null;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, confidence }) => {
  if (source === 'AI_CLASSIFICATION') {
    return (
      <span className="badge badge-ai" title="Classified by AI model">
        🤖 AI
        {confidence != null && confidence < 1 && (
          <span className="opacity-75 font-normal ml-1">{(confidence * 100).toFixed(0)}%</span>
        )}
      </span>
    );
  }
  if (source === 'RULE_BASED_FALLBACK') {
    return (
      <span className="badge badge-rule" title="Classified by rule-based fallback">
        📋 Rules
      </span>
    );
  }
  return (
    <span className="badge badge-noclass" title="No classification applied">
      🖼 Unclassified
    </span>
  );
};
