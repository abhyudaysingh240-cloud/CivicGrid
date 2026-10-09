import React from 'react';
import { Handle, Position } from 'reactflow';
import { Server, AlertTriangle } from 'lucide-react';

interface DPNodeProps {
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

export const DistributionPointNode: React.FC<DPNodeProps> = ({ data }) => {
  const isHealthy = data.is_energized && data.status !== 'ISOLATED';

  return (
    <div
      onClick={data.onSelect}
      className={`px-3 py-2 rounded-xl border transition-all cursor-pointer shadow-md min-w-[170px] ${
        isHealthy
          ? 'bg-slate-900/90 border-slate-700 hover:border-amber-500/60'
          : 'bg-red-950/90 border-red-500 shadow-red-500/20'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-2.5 !h-2.5" />

      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5">
          <Server className={`w-3.5 h-3.5 ${isHealthy ? 'text-amber-400' : 'text-red-400'}`} />
          <span className="font-mono text-[11px] font-bold text-amber-300">
            {data.node_code}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: data.criticality }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          ))}
        </div>
      </div>

      <div className="text-[11px] text-slate-300 line-clamp-1">
        {data.label}
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>Load: {data.load_mw.toFixed(2)} MW</span>
        <span className={isHealthy ? 'text-emerald-400' : 'text-red-400 font-bold'}>
          {isHealthy ? 'ENERGIZED' : 'ISOLATED'}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-2.5 !h-2.5" />
    </div>
  );
};
