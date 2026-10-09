import React from 'react';
import { Handle, Position } from 'reactflow';
import { Home, Building2, Flame, HeartPulse } from 'lucide-react';

interface LoadNodeProps {
  data: {
    label: string;
    node_code: string;
    criticality: number;
    is_energized: boolean;
    load_mw: number;
    status: string;
    onSelect?: () => void;
  };
}

export const LoadNode: React.FC<LoadNodeProps> = ({ data }) => {
  const isHealthy = data.is_energized && data.status !== 'ISOLATED';
  const isHighCritical = data.criticality >= 4;

  const getIcon = () => {
    if (data.node_code.includes('HOSPITAL')) return <HeartPulse className="w-3.5 h-3.5 text-rose-400" />;
    if (data.node_code.includes('COMM') || data.node_code.includes('TECH')) return <Building2 className="w-3.5 h-3.5 text-blue-400" />;
    return <Home className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div
      onClick={data.onSelect}
      className={`px-3 py-2 rounded-xl border transition-all cursor-pointer shadow-md min-w-[160px] ${
        isHealthy
          ? isHighCritical
            ? 'bg-slate-900/90 border-blue-500/50 hover:border-blue-400'
            : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500'
          : 'bg-red-950/90 border-red-500 shadow-red-500/25 animate-pulse'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />

      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5">
          {getIcon()}
          <span className="font-mono text-[10px] font-bold text-slate-300">
            {data.node_code}
          </span>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: data.criticality }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full ${isHighCritical ? 'bg-rose-400' : 'bg-slate-400'}`}
            />
          ))}
        </div>
      </div>

      <div className="text-[11px] font-medium text-slate-200 line-clamp-1">
        {data.label}
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-400">{data.load_mw.toFixed(1)} MW</span>
        <span
          className={`px-1 rounded text-[9px] font-bold ${
            isHealthy ? 'text-emerald-400 bg-emerald-950/50' : 'text-red-400 bg-red-950/80'
          }`}
        >
          {isHealthy ? 'ONLINE' : 'UNSERVED'}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
    </div>
  );
};
