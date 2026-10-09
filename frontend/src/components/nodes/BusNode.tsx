import React from 'react';
import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

interface BusNodeProps {
  data: {
    label: string;
    node_code: string;
    nominal_voltage_kv: number;
    is_energized: boolean;
    onSelect?: () => void;
  };
}

export const BusNode: React.FC<BusNodeProps> = ({ data }) => {
  return (
    <div
      onClick={data.onSelect}
      className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-md flex items-center gap-2 ${
        data.is_energized
          ? 'bg-slate-900/90 border-slate-700 hover:border-electric-500/60'
          : 'bg-red-950/80 border-red-500/80 text-red-300'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />
      
      <div className={`w-2 h-2 rounded-full ${data.is_energized ? 'bg-emerald-400' : 'bg-red-500 animate-ping'}`} />
      <span className="font-mono text-[11px] font-semibold text-slate-300">
        {data.node_code}
      </span>
      <span className="text-[9px] font-mono text-slate-500">
        {data.nominal_voltage_kv}kV
      </span>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
    </div>
  );
};
