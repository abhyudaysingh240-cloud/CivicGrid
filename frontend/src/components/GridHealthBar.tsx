import React from 'react';
import { GridState, GridIsland } from '../types';
import { Activity, AlertOctagon, CheckCircle2, AlertTriangle, HelpCircle, ShieldAlert } from 'lucide-react';

interface GridHealthBarProps {
  state: GridState;
  islands: GridIsland[];
  activeFaultsCount: number;
  onOpenWhyRestoration: () => void;
}

export const GridHealthBar: React.FC<GridHealthBarProps> = ({
  state,
  islands,
  activeFaultsCount,
  onOpenWhyRestoration,
}) => {
  const getStateColor = () => {
    switch (state.state_enum) {
      case 'NORMAL':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'FAULT_DETECTED':
      case 'ISLANDED':
      case 'ANALYZING':
      case 'RECONFIGURING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse';
      case 'RESTORED':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
      case 'RECONFIGURATION_FAILED':
        return 'bg-red-500/15 text-red-400 border-red-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* State Machine Status Pill */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-charcoal-800 border border-charcoal-700 text-electric-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Grid Finite State Machine
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getStateColor()}`}>
                ● {state.state_enum}
              </span>
              {(state.state_enum === 'RESTORED' || state.state_enum === 'RECONFIGURATION_FAILED' || state.state_enum === 'ISLANDED') && (
                <button
                  onClick={onOpenWhyRestoration}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono text-electric-400 hover:text-white bg-electric-500/15 hover:bg-electric-500/25 border border-electric-500/30 transition-all"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why?</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quantified Numerical Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          <div className="bg-charcoal-800/80 border border-charcoal-700/60 rounded-xl px-3 py-2">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Total Load</div>
            <div className="text-base font-bold font-mono text-slate-100">
              {state.total_load_mw.toFixed(1)} <span className="text-xs font-normal text-slate-400">MW</span>
            </div>
          </div>

          <div className="bg-charcoal-800/80 border border-charcoal-700/60 rounded-xl px-3 py-2">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Affected Load</div>
            <div className="text-base font-bold font-mono text-amber-400">
              {state.affected_load_mw.toFixed(1)} <span className="text-xs font-normal text-slate-400">MW</span>
            </div>
          </div>

          <div className="bg-charcoal-800/80 border border-charcoal-700/60 rounded-xl px-3 py-2">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Restored Load</div>
            <div className="text-base font-bold font-mono text-emerald-400">
              {state.restored_load_mw.toFixed(1)} <span className="text-xs font-normal text-slate-400">MW</span>
            </div>
          </div>

          <div className="bg-charcoal-800/80 border border-charcoal-700/60 rounded-xl px-3 py-2">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Unserved Load</div>
            <div className={`text-base font-bold font-mono ${state.unserved_load_mw > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {state.unserved_load_mw.toFixed(1)} <span className="text-xs font-normal text-slate-400">MW</span>
            </div>
          </div>
        </div>

        {/* Restoration % Progress Meter */}
        <div className="w-full lg:w-48 bg-charcoal-800/80 border border-charcoal-700/60 rounded-xl p-2.5">
          <div className="flex justify-between items-center text-[11px] font-mono mb-1.5">
            <span className="text-slate-400">RESTORATION</span>
            <span className={`font-bold ${
              state.affected_load_mw === 0 || state.restoration_pct === null || state.restoration_status === 'NO_ACTIVE_FAULT'
                ? 'text-slate-400 text-[10px]'
                : state.restoration_pct >= 99
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}>
              {state.affected_load_mw === 0 || state.restoration_pct === null || state.restoration_status === 'NO_ACTIVE_FAULT'
                ? 'N/A, no active fault'
                : `${state.restoration_pct.toFixed(0)}%`}
            </span>
          </div>
          <div className="w-full h-2 bg-charcoal-950 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                state.affected_load_mw === 0 || state.restoration_pct === null
                  ? 'bg-slate-700'
                  : state.restoration_pct >= 99
                  ? 'bg-emerald-400'
                  : state.restoration_pct > 0
                  ? 'bg-amber-400'
                  : 'bg-red-500'
              }`}
              style={{
                width: state.affected_load_mw === 0 || state.restoration_pct === null
                  ? '0%'
                  : `${state.restoration_pct}%`
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1">
            <span>Faults: {activeFaultsCount}</span>
            <span>Islands: {islands.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
