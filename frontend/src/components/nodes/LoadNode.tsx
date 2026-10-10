import React from 'react';
import { Handle, Position } from 'reactflow';
import { Home, Building2, GraduationCap, HeartPulse, Train, Droplets, Cpu, AlertTriangle } from 'lucide-react';

interface LoadNodeProps {
  data: {
    label: string;
    node_code: string;
    display_code?: string;
    tag?: string;
    description?: string;
    criticality: number;
    is_energized: boolean;
    load_mw: number;
    status: string;
    hasCriticalComplaint?: boolean;
    complaintCount?: number;
    maxSeverity?: number;
    onSelect?: () => void;
  };
}

export const LoadNode: React.FC<LoadNodeProps> = ({ data }) => {
  const isHealthy = data.is_energized && data.status !== 'ISOLATED';
  const isHighCritical = data.criticality >= 4;
  const isCoer = data.node_code === 'LOAD_UNIVERSITY' || data.label.includes('COER');
  const hasCriticalAlert = !!data.hasCriticalComplaint;

  const getIcon = () => {
    if (isCoer) return <GraduationCap className="w-4 h-4 text-amber-300" />;
    if (data.node_code.includes('HOSPITAL') || data.label.includes('Hospital')) return <HeartPulse className="w-3.5 h-3.5 text-rose-400" />;
    if (data.node_code.includes('TRANSIT') || data.label.includes('Transit') || data.label.includes('Railway')) return <Train className="w-3.5 h-3.5 text-cyan-400" />;
    if (data.node_code.includes('WATER') || data.label.includes('Water') || data.label.includes('Canal')) return <Droplets className="w-3.5 h-3.5 text-blue-400" />;
    if (data.node_code.includes('TECH') || data.label.includes('IIT')) return <Cpu className="w-3.5 h-3.5 text-indigo-400" />;
    if (data.node_code.includes('COMM') || data.label.includes('Commercial')) return <Building2 className="w-3.5 h-3.5 text-sky-400" />;
    return <Home className="w-3.5 h-3.5 text-slate-400" />;
  };

  const displayCode = data.display_code || data.node_code;
  const tag = data.tag || (isCoer ? 'Academic & Innovation Hub' : undefined);

  return (
    <div
      onClick={data.onSelect}
      className={`relative px-3 py-2.5 rounded-xl border transition-all cursor-pointer shadow-lg min-w-[190px] max-w-[240px] ${
        hasCriticalAlert
          ? 'bg-red-950/95 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.55)] ring-2 ring-red-500 animate-pulse'
          : isHealthy
          ? isCoer
            ? 'bg-slate-900/95 border-amber-500/70 shadow-[0_0_18px_rgba(245,158,11,0.25)] hover:border-amber-400'
            : isHighCritical
            ? 'bg-slate-900/90 border-blue-500/60 shadow-blue-500/10 hover:border-blue-400'
            : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500'
          : 'bg-red-950/90 border-red-500 shadow-red-500/25 animate-pulse'
      }`}
    >
      {/* Glowing Critical Complaint Badge */}
      {hasCriticalAlert && (
        <div className="absolute -top-3 -right-2 z-20 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-red-600 text-white shadow-xl border border-red-200 flex items-center gap-1.5 animate-bounce ring-4 ring-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>⚠️ SEV {data.maxSeverity || 5} ALERT</span>
        </div>
      )}

      {/* Non-critical Complaint count pill */}
      {!hasCriticalAlert && (data.complaintCount || 0) > 0 && (
        <div className="absolute -top-2 -right-2 z-20 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500 text-slate-950 border border-amber-300 shadow-md">
          {data.complaintCount} reports
        </div>
      )}

      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />

      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5">
          <div className={`p-1 rounded-md ${isCoer ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800'}`}>
            {getIcon()}
          </div>
          <span className={`font-mono text-[10px] font-bold ${isCoer ? 'text-amber-300' : 'text-slate-300'}`}>
            {displayCode}
          </span>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: data.criticality }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                isCoer ? 'bg-amber-400' : isHighCritical ? 'bg-rose-400' : 'bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="text-[11px] font-semibold text-slate-100 line-clamp-1">
        {data.label}
      </div>

      {tag && (
        <div className={`text-[9px] font-mono font-medium tracking-wide ${isCoer ? 'text-amber-400/90' : 'text-slate-400'}`}>
          {tag}
        </div>
      )}

      {data.description && isCoer && (
        <div className="text-[8.5px] text-slate-400/80 line-clamp-1 mt-0.5 italic">
          {data.description}
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-400 font-semibold">{data.load_mw.toFixed(1)} MW</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
            hasCriticalAlert
              ? 'text-red-300 bg-red-900/80 border border-red-500/60 animate-pulse'
              : isHealthy
              ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
              : 'text-red-400 bg-red-950/80 border border-red-500/40'
          }`}
        >
          {hasCriticalAlert ? 'ALERT ACTIVE' : isHealthy ? 'ONLINE' : 'UNSERVED'}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
    </div>
  );
};

