import React from 'react';
import { Handle, Position } from 'reactflow';
import { Zap, ShieldCheck, AlertCircle } from 'lucide-react';

interface SubstationNodeProps {
  data: {
    label: string;
    node_code: string;
    display_code?: string;
    tag?: string;
    description?: string;
    nominal_voltage_kv: number;
    max_capacity_mw?: number;
    current_supply_mw?: number;
    is_energized: boolean;
    status: string;
    hasCriticalComplaint?: boolean;
    complaintCount?: number;
    onSelect?: () => void;
  };
}

export const SubstationNode: React.FC<SubstationNodeProps> = ({ data }) => {
  const isHealthy = data.is_energized && data.status === 'OPERATIONAL';
  const supply = data.current_supply_mw || 0;
  const cap = data.max_capacity_mw || 45;
  const pct = Math.min(100, Math.round((supply / cap) * 100));
  const hasAlert = !!data.hasCriticalComplaint;
  const displayCode = data.display_code || data.node_code;

  return (
    <div
      onClick={data.onSelect}
      className={`relative px-4 py-3 rounded-xl border transition-all cursor-pointer shadow-lg min-w-[220px] max-w-[280px] ${
        hasAlert
          ? 'bg-slate-900/95 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
          : isHealthy
          ? 'bg-slate-900/90 border-electric-500/60 shadow-electric-500/20 hover:border-electric-400'
          : 'bg-red-950/90 border-red-500 shadow-red-500/30 animate-pulse'
      }`}
    >
      {(data.complaintCount || 0) > 0 && (
        <div className="absolute -top-2.5 -right-2 z-20 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500 text-slate-950 border border-amber-300 shadow-lg flex items-center gap-1">
          <AlertCircle className="w-2.5 h-2.5" />
          <span>{data.complaintCount} Sector Reports</span>
        </div>
      )}

      <Handle type="target" position={Position.Top} className="!bg-electric-400 !w-3 !h-3" />
      
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-electric-500/20 text-electric-400">
            <Zap className="w-4 h-4" />
          </div>
          <span className="font-mono text-xs font-bold text-electric-400 uppercase tracking-wider">
            {displayCode}
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">
          {data.nominal_voltage_kv}kV
        </span>
      </div>

      <div className="text-xs font-semibold text-slate-100 line-clamp-1 mb-1">
        {data.label}
      </div>

      {data.tag && (
        <div className="text-[9px] font-mono text-electric-300/80 mb-2">
          {data.tag}
        </div>
      )}

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

