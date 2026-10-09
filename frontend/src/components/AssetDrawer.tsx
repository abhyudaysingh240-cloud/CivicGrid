import React, { useEffect, useState } from 'react';
import { GridNode, InfrastructureAsset } from '../types';
import { apiRequest } from '../api/client';
import { X, ShieldAlert, Zap, AlertTriangle, FileText, CheckCircle, Wrench, HelpCircle } from 'lucide-react';

interface AssetDrawerProps {
  selectedNode: GridNode | null;
  onClose: () => void;
  onInjectFaultOnLine: (edgeCode: string) => void;
  onOpenWhyRisk: (assetId: number) => void;
  canInjectFault: boolean;
}

export const AssetDrawer: React.FC<AssetDrawerProps> = ({
  selectedNode,
  onClose,
  onInjectFaultOnLine,
  onOpenWhyRisk,
  canInjectFault,
}) => {
  const [asset, setAsset] = useState<InfrastructureAsset | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedNode) {
      setAsset(null);
      return;
    }

    setLoading(true);
    apiRequest<InfrastructureAsset[]>('/civic/assets')
      .then((assets) => {
        const found = assets.find((a) => a.grid_node_id === selectedNode.id || a.asset_code.includes(selectedNode.node_code));
        setAsset(found || null);
      })
      .catch(() => setAsset(null))
      .finally(() => setLoading(false));
  }, [selectedNode]);

  if (!selectedNode) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-charcoal-900 border-l border-charcoal-700/80 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
      <div>
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-charcoal-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-electric-500/15 text-electric-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase">DIGITAL TWIN ASSET</div>
              <h2 className="text-base font-bold text-slate-100">{selectedNode.node_code}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Node Properties */}
        <div className="mt-5 space-y-4">
          <div>
            <div className="text-xs text-slate-400">Designation</div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5">{selectedNode.name}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-charcoal-800/80 p-2.5 rounded-xl border border-charcoal-700/60">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Node Type</div>
              <div className="text-xs font-mono font-bold text-slate-200 mt-1">{selectedNode.node_type}</div>
            </div>

            <div className="bg-charcoal-800/80 p-2.5 rounded-xl border border-charcoal-700/60">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Nominal Voltage</div>
              <div className="text-xs font-mono font-bold text-slate-200 mt-1">{selectedNode.nominal_voltage_kv} kV</div>
            </div>

            <div className="bg-charcoal-800/80 p-2.5 rounded-xl border border-charcoal-700/60">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Current Load</div>
              <div className="text-xs font-mono font-bold text-amber-400 mt-1">{selectedNode.load_mw.toFixed(2)} MW</div>
            </div>

            <div className="bg-charcoal-800/80 p-2.5 rounded-xl border border-charcoal-700/60">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Criticality</div>
              <div className="text-xs font-mono font-bold text-rose-400 mt-1">Tier {selectedNode.criticality} / 5</div>
            </div>
          </div>

          {/* Infrastructure Asset Mapping & Risk Assessment */}
          {asset && (
            <div className="bg-charcoal-800/50 p-4 rounded-xl border border-charcoal-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300">
                  <ShieldAlert className="w-4 h-4 text-electric-400" />
                  <span>PREDICTIVE ASSET RISK</span>
                </div>
                <button
                  onClick={() => onOpenWhyRisk(asset.id)}
                  className="flex items-center gap-1 text-[11px] font-mono text-electric-400 hover:text-white bg-electric-500/15 hover:bg-electric-500/25 px-2 py-0.5 rounded border border-electric-500/30 transition-all"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Why?</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-400">Risk Score</div>
                  <div className="text-lg font-bold font-mono text-slate-100">{asset.current_risk_score.toFixed(1)} / 100</div>
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

              <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-charcoal-700">
                Installed: {asset.installation_year} | Asset Code: {asset.asset_code}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Footer */}
      <div className="pt-4 border-t border-charcoal-800 space-y-2">
        <div className="text-[11px] font-mono text-slate-500 uppercase">SIMULATED ACTIONS</div>
        {canInjectFault && (
          <p className="text-xs text-slate-400">
            Use the Grid Operator scenario controls or fault injection dropdown to simulate edge trips on this feeder.
          </p>
        )}
      </div>
    </div>
  );
};
