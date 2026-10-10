import React, { useState } from 'react';
import { Scenario, GridEdge } from '../types';
import { Play, RotateCcw, Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react';

/** Roorkee-localized branch lines for manual fault injection.
 *  Each `realEdgeCode` maps to the actual edge_code used by the simulation engine. */
export const ROORKEE_BRANCH_LINES: { id: string; label: string; realEdgeCode: string }[] = [
  {
    id: 'LINE_COER_CAMPUS',
    label: 'LINE_COER_CAMPUS — 220kV Substation → COER University Campus Feeder (2.1 MW)',
    realEdgeCode: 'LINE_DP_N1_UNIV',
  },
  {
    id: 'LINE_KALIYAR_TRUNK',
    label: 'LINE_KALIYAR_TRUNK — Piran Kaliyar Substation Main Feeder Bus N2 (7.2 MW)',
    realEdgeCode: 'LINE_BUS_N2_DP_N2',
  },
  {
    id: 'LINE_CIVIL_HOSPITAL',
    label: 'LINE_CIVIL_HOSPITAL — DP Civil Lines → Civil Hospital Trauma Unit (3.8 MW)',
    realEdgeCode: 'LINE_DP_N2_HOSPITAL',
  },
  {
    id: 'LINE_RAILWAY_TRANSIT',
    label: 'LINE_RAILWAY_TRANSIT — PTCUL Substation → Roorkee Railway Junction Hub (2.9 MW)',
    realEdgeCode: 'LINE_BUS_N2_TRANSIT',
  },
  {
    id: 'LINE_GANGA_PUMPING',
    label: 'LINE_GANGA_PUMPING — DP Industrial → Upper Ganga Canal Pumping Station (4.2 MW)',
    realEdgeCode: 'LINE_DP_S1_WATER',
  },
  {
    id: 'LINE_NAGAR_NIGAM',
    label: 'LINE_NAGAR_NIGAM — DP Vardhmanpuram → Roorkee Municipal Corporation (2.2 MW)',
    realEdgeCode: 'LINE_DP_N1_CITY_HALL',
  },
  {
    id: 'LINE_IIT_RESEARCH',
    label: 'LINE_IIT_RESEARCH — DP Tech Park → IIT Roorkee Research Grid (4.5 MW)',
    realEdgeCode: 'LINE_DP_E1_TECH',
  },
  {
    id: 'LINE_CIVIL_LINES_RES',
    label: 'LINE_CIVIL_LINES_RES — Bus S2 → Civil Lines Residential Sector (2.8 MW)',
    realEdgeCode: 'LINE_BUS_S2_RES1',
  },
  {
    id: 'LINE_BHAGWANPUR_TRUNK',
    label: 'LINE_BHAGWANPUR_TRUNK — 132kV Bhagwanpur Substation Main Feeder Bus E1 (6.5 MW)',
    realEdgeCode: 'LINE_SUB_E_BUS_E1',
  },
];

interface ScenarioControlPanelProps {
  scenarios: Scenario[];
  edges: GridEdge[];
  onRunScenario: (code: string) => Promise<void>;
  onResetGrid: () => Promise<void>;
  onInjectFault: (edgeCode: string) => Promise<void>;
  loading: boolean;
}

export const ScenarioControlPanel: React.FC<ScenarioControlPanelProps> = ({
  scenarios,
  edges,
  onRunScenario,
  onResetGrid,
  onInjectFault,
  loading,
}) => {
  // Stores the *display* id (e.g. 'LINE_COER_CAMPUS') – resolved to a real edge_code on inject
  const [selectedEdge, setSelectedEdge] = useState('');
  const [runningCode, setRunningCode] = useState<string | null>(null);

  const handleRun = async (code: string) => {
    setRunningCode(code);
    try {
      await onRunScenario(code);
    } finally {
      setRunningCode(null);
    }
  };

  const handleManualFault = async () => {
    if (!selectedEdge) return;
    // Resolve display-id → real edge_code for the simulation engine
    const match = ROORKEE_BRANCH_LINES.find((l) => l.id === selectedEdge);
    const realCode = match ? match.realEdgeCode : selectedEdge;
    await onInjectFault(realCode);
    setSelectedEdge('');
  };

  return (
    <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Header and Reset Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-electric-500/15 text-electric-400">
            <Play className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            DETERMINISTIC SCENARIO SUITE (A-E)
          </span>
        </div>

        <button
          onClick={onResetGrid}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 hover:text-white bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-600 transition-all disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5 text-electric-400" />
          <span>RESET TO HEALTHY BASELINE</span>
        </button>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
        {scenarios.map((sc) => {
          const isCurrentRunning = runningCode === sc.scenario_code;
          return (
            <div
              key={sc.scenario_code}
              className="bg-charcoal-950/70 border border-charcoal-700/60 rounded-xl p-3 flex flex-col justify-between hover:border-charcoal-600 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-electric-500/20 text-electric-300">
                    SCENARIO {sc.scenario_code}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-200 line-clamp-1">{sc.name}</div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {sc.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-charcoal-800/80">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRun(sc.code ?? sc.scenario_code);
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono font-semibold bg-electric-500/15 hover:bg-electric-500/30 text-electric-300 border border-electric-500/40 transition-all disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  <span>{isCurrentRunning ? 'Running...' : 'Run Scenario'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Line Trip Fault Injection */}
      <div className="pt-3 border-t border-charcoal-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>MANUAL FAULT INJECTION (TRIP RADIAL LINE):</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedEdge}
            onChange={(e) => setSelectedEdge(e.target.value)}
            className="bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-electric-400 min-w-[26rem] max-w-full"
          >
            <option value="">⚡ Select Roorkee feeder line to trip...</option>
            {ROORKEE_BRANCH_LINES.map((line) => (
              <option key={line.id} value={line.id}>
                {line.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleManualFault}
            disabled={!selectedEdge || loading}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 transition-all disabled:opacity-40"
          >
            TRIP LINE
          </button>
        </div>
      </div>
    </div>
  );
};
