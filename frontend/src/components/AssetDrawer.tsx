import React, { useEffect, useState } from 'react';
import { GridNode, GridEdge, InfrastructureAsset } from '../types';
import { apiRequest } from '../api/client';
import {
  X,
  ShieldAlert,
  Zap,
  AlertTriangle,
  FileText,
  CheckCircle,
  Wrench,
  HelpCircle,
  Activity,
  UserCheck,
  MapPin,
  Clock,
  User,
  GraduationCap,
  Building2,
  Phone
} from 'lucide-react';
import { useReports, getNodeSectorReports } from '../hooks/useReports';

interface AssetDrawerProps {
  selectedNode: GridNode | null;
  selectedEdge?: GridEdge | null;
  onClose: () => void;
  onInjectFaultOnLine: (edgeCode: string) => void;
  onOpenWhyRisk: (assetId: number) => void;
  canInjectFault: boolean;
}

export const AssetDrawer: React.FC<AssetDrawerProps> = ({
  selectedNode,
  selectedEdge,
  onClose,
  onInjectFaultOnLine,
  onOpenWhyRisk,
  canInjectFault,
}) => {
  const [asset, setAsset] = useState<InfrastructureAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const { reports } = useReports();

  useEffect(() => {
    if (!selectedNode) {
      setAsset(null);
      return;
    }

    setLoading(true);
    apiRequest<InfrastructureAsset[]>('/civic/assets')
      .then((assets) => {
        const found = assets.find(
          (a) => a.grid_node_id === selectedNode.id || a.asset_code.includes(selectedNode.node_code)
        );
        setAsset(found || null);
      })
      .catch(() => setAsset(null))
      .finally(() => setLoading(false));
  }, [selectedNode]);

  if (!selectedNode && !selectedEdge) return null;

  // ── Edge detail panel ──────────────────────────────────────────────────────
  if (selectedEdge && !selectedNode) {
    const e = selectedEdge;
    const utilPct =
      e.max_capacity_mw > 0 ? Math.min((e.current_load_mw / e.max_capacity_mw) * 100, 100) : 0;
    const utilColor =
      utilPct >= 90
        ? '#ef4444'
        : utilPct >= 70
        ? '#f97316'
        : utilPct >= 50
        ? '#f59e0b'
        : utilPct >= 25
        ? '#38bdf8'
        : '#6366f1';
    return (
      <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-charcoal-900 border-l border-charcoal-700/80 shadow-2xl p-6 flex flex-col gap-5 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-charcoal-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-electric-500/15 text-electric-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase">FEEDER LINE DETAIL</div>
              <h2 className="text-base font-bold text-slate-100">{e.edge_code}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm font-semibold text-slate-200">{e.name}</div>

        {/* Thermal utilization bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
            <span>THERMAL UTILIZATION</span>
            <span style={{ color: utilColor }} className="font-bold">
              {utilPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2.5 w-full bg-charcoal-800 rounded-full overflow-hidden border border-charcoal-700">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${utilPct}%`, background: utilColor }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
            <span>{e.current_load_mw.toFixed(2)} MW</span>
            <span>Cap: {e.max_capacity_mw.toFixed(2)} MW</span>
          </div>
        </div>

        {/* Properties grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Status',
              value: e.status,
              color:
                e.status === 'FAULTED'
                  ? '#ef4444'
                  : e.status === 'OPERATIONAL'
                  ? '#10b981'
                  : '#f59e0b',
            },
            {
              label: 'Tie Switch',
              value: e.is_tie_switch ? 'YES' : 'NO',
              color: e.is_tie_switch ? '#f59e0b' : '#94a3b8',
            },
            { label: 'Resistance', value: `${e.resistance_ohms.toFixed(3)} Ω`, color: undefined },
            { label: 'Reactance', value: `${e.reactance_ohms.toFixed(3)} Ω`, color: undefined },
            { label: 'Distance', value: `${e.distance_km.toFixed(2)} km`, color: undefined },
            { label: 'Direction', value: `${e.src_code} → ${e.dst_code}`, color: '#38bdf8' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-charcoal-800/80 p-2.5 rounded-xl border border-charcoal-700/60">
              <div className="text-[10px] font-mono text-slate-400 uppercase">{label}</div>
              <div className="text-xs font-mono font-bold mt-1" style={{ color: color || '#e2e8f0' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Fault inject CTA */}
        {canInjectFault && e.status !== 'FAULTED' && (
          <button
            onClick={() => {
              onInjectFaultOnLine(e.edge_code);
              onClose();
            }}
            className="mt-auto w-full py-2.5 rounded-xl text-sm font-bold font-mono bg-red-500/15 text-red-400 border border-red-500/40 hover:bg-red-500/25 hover:text-red-300 transition-all"
          >
            ⚡ Inject Fault on {e.edge_code}
          </button>
        )}
      </div>
    );
  }

  // ── Node detail panel ──────────────────────────────────────────────────────
  const isCoer =
    selectedNode.node_code === 'LOAD_UNIVERSITY' || selectedNode.name.includes('COER');
  const isPtcul =
    selectedNode.node_code === 'SUB_NORTH' || selectedNode.name.includes('PTCUL');
  const sectorReports = getNodeSectorReports(reports, selectedNode.node_code, selectedNode.name);

  const isSubstation = selectedNode.node_type === 'SUBSTATION';
  const nodeSupply = selectedNode.current_supply_mw || selectedNode.load_mw || 0;
  const nodeCapacity = selectedNode.max_capacity_mw || (isSubstation ? 45 : 10);
  const nodeUtilPct = Math.min(100, (nodeSupply / Math.max(1, nodeCapacity)) * 100);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[440px] bg-charcoal-900 border-l border-charcoal-700/80 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-5">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-charcoal-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isCoer
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-electric-500/15 text-electric-400'
              }`}
            >
              {isCoer ? <GraduationCap className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                ROORKEE GRID DIGITAL TWIN NODE
              </div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{selectedNode.node_code}</span>
                {isCoer && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-semibold">
                    Campus Anchor
                  </span>
                )}
                {isPtcul && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-electric-500/20 text-electric-300 border border-electric-500/40 font-mono font-semibold">
                    Master 220kV Hub
                  </span>
                )}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Node Designation Header */}
        <div className="bg-charcoal-950/80 p-3.5 rounded-xl border border-charcoal-700/70">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Sector Designation</div>
          <div className="text-sm font-bold text-slate-100 mt-0.5">{selectedNode.name}</div>
          {isCoer && (
            <p className="text-xs text-amber-300/90 mt-1 font-mono">
              ★ Category: Academic & Innovation Hub | Vardhmanpuram Feeder Loop
            </p>
          )}
          {isPtcul && (
            <p className="text-xs text-electric-300/90 mt-1 font-mono">
              ★ 220kV/132kV State Grid Transmission Interconnect & North Master Step-Down
            </p>
          )}
        </div>

        {/* Live Load Statistics */}
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-electric-400" />
              <span>LIVE LOAD & ELECTRICAL TELEMETRY</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                selectedNode.is_energized && selectedNode.status === 'OPERATIONAL'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}
            >
              {selectedNode.is_energized && selectedNode.status === 'OPERATIONAL'
                ? 'ENERGIZED / NOMINAL'
                : 'ISOLATED / UNSERVED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-charcoal-800/80 p-2.5 rounded-xl border border-charcoal-700/60">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Voltage Tier</div>
              <div className="text-xs font-mono font-bold text-slate-100 mt-1">
                {selectedNode.nominal_voltage_kv} kV
              </div>
            </div>

            <div className="bg-charcoal-800/80 p-2.5 rounded-xl border border-charcoal-700/60">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Active Demand</div>
              <div className="text-xs font-mono font-bold text-amber-400 mt-1">
                {selectedNode.load_mw.toFixed(2)} MW
              </div>
            </div>

            <div className="bg-charcoal-800/80 p-2.5 rounded-xl border border-charcoal-700/60">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Criticality Tier</div>
              <div className="text-xs font-mono font-bold text-rose-400 mt-1">
                Tier {selectedNode.criticality} / 5 Priority
              </div>
            </div>

            <div className="bg-charcoal-800/80 p-2.5 rounded-xl border border-charcoal-700/60">
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                {isSubstation ? 'Supply / Cap' : 'Max Feeder Cap'}
              </div>
              <div className="text-xs font-mono font-bold text-slate-100 mt-1">
                {nodeCapacity.toFixed(1)} MW
              </div>
            </div>
          </div>

          {/* Load capacity bar */}
          <div className="bg-charcoal-950/60 p-2.5 rounded-xl border border-charcoal-800">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>Grid Feeder Utilization</span>
              <span className="font-bold text-slate-200">{nodeUtilPct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-charcoal-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  nodeUtilPct >= 90
                    ? 'bg-red-500'
                    : nodeUtilPct >= 70
                    ? 'bg-amber-500'
                    : 'bg-electric-400'
                }`}
                style={{ width: `${nodeUtilPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Real Active Sector Complaints */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>ACTIVE CITIZEN COMPLAINTS IN SECTOR</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {sectorReports.length} {sectorReports.length === 1 ? 'Report' : 'Reports'}
            </span>
          </div>

          {sectorReports.length === 0 ? (
            <div className="bg-charcoal-800/40 p-3.5 rounded-xl border border-charcoal-700/50 text-center">
              <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <div className="text-xs text-slate-300 font-medium">No open citizen complaints in this sector</div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                Feeder telemetry normal. New complaints submitted via portal appear live here.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {sectorReports.map((rep) => {
                const isCrit = Number(rep.severity) >= 4 || rep.priority_level === 'CRITICAL';
                return (
                  <div
                    key={rep.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isCrit
                        ? 'bg-red-950/40 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                        : 'bg-charcoal-800/60 border-charcoal-700/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-slate-200">
                          {rep.id}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            isCrit
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          Severity {rep.severity}/5
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-400 uppercase">
                          {rep.category || 'Electrical'}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                          rep.status === 'IN_PROGRESS'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : rep.status === 'ASSIGNED'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-snug">{rep.description}</p>

                    {/* Assigned Worker Details */}
                    <div className="mt-2 pt-2 border-t border-charcoal-700/60 flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>
                          {rep.assignedTo ? (
                            <span className="text-slate-200 font-semibold">
                              Assigned: {rep.assignedTo}
                            </span>
                          ) : (
                            <span className="text-amber-400">Unassigned — Pending Dispatch</span>
                          )}
                        </span>
                      </div>
                      <span className="text-slate-500 shrink-0">
                        {new Date(rep.created_at || rep.submittedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Infrastructure Asset Risk Assessment */}
        {asset && (
          <div className="bg-charcoal-800/50 p-3.5 rounded-xl border border-charcoal-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300">
                <ShieldAlert className="w-4 h-4 text-electric-400" />
                <span>PREDICTIVE ASSET HEALTH & RISK</span>
              </div>
              <button
                onClick={() => onOpenWhyRisk(asset.id)}
                className="flex items-center gap-1 text-[11px] font-mono text-electric-400 hover:text-white bg-electric-500/15 hover:bg-electric-500/25 px-2 py-0.5 rounded border border-electric-500/30 transition-all"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Explain Risk</span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-400">Calculated Risk Score</div>
                <div className="text-base font-bold font-mono text-slate-100">
                  {asset.current_risk_score.toFixed(1)} / 100
                </div>
              </div>
              <div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                    asset.current_risk_level === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : asset.current_risk_level === 'HIGH'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}
                >
                  {asset.current_risk_level} RISK
                </span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-400 pt-1.5 border-t border-charcoal-700/60">
              Installed: {asset.installation_year} | Asset Code: {asset.asset_code}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-charcoal-800 space-y-2 mt-4">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          COMMAND & AUDIT STATUS
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Sector synchronized with Roorkee SCADA digital twin telemetry and real-time citizen grievance pipeline.
        </p>
      </div>
    </div>
  );
};

