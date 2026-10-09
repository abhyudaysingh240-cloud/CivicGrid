import React from 'react';
import { Handle, Position } from 'reactflow';
import { Zap, ShieldCheck } from 'lucide-react';

interface SubstationNodeProps {
  data: {
    label: string;
    node_code: string;
    nominal_voltage_kv: number;
    max_capacity_mw?: number;
    current_supply_mw?: number;
    is_energized: boolean;
    status: string;
    onSelect?: () => void;
  };
}

export const SubstationNode: React.FC<SubstationNodeProps> = ({ data }) => {
  const isHealthy = data.is_energized && data.status === 'OPERATIONAL';
  const supply = data.current_supply_mw || 0;
  const cap = data.max_capacity_mw || 40;
  const pct = Math.min(100, Math.round((supply / cap) * 100));

  return (
    <div
      onClick={data.onSelect}
      className={`px-4 py-3 rounded-xl border transition-all cursor-pointer shadow-lg min-w-[200px] ${
        isHealthy
          ? 'bg-slate-900/90 border-electric-500/60 shadow-electric-500/20 hover:border-electric-400'
          : 'bg-red-950/90 border-red-500 shadow-red-500/30'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-electric-400 !w-3 !h-3" />
      
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-electric-500/20 text-electric-400">
            <Zap className="w-4 h-4" />
          </div>
          <span className="font-mono text-xs font-bold text-electric-400 uppercase tracking-wider">
            {data.node_code}
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
          {data.nominal_voltage_kv}kV
        </span>
      </div>

      <div className="text-xs font-semibold text-slate-200 line-clamp-1 mb-2">
        {data.label}
      </div>

      {/* Capacity Utilization Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>Load: {supply.toFixed(1)} MW</span>
          <span>Max: {cap.toFixed(0)} MW</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              pct > 85 ? 'bg-amber-400' : 'bg-electric-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-electric-400 !w-3 !h-3" />
    </div>
  );
};
