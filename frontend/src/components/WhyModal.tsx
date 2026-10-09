import React from 'react';
import { X, HelpCircle, CheckCircle, AlertTriangle, ShieldAlert, Cpu } from 'lucide-react';

export type WhyModalType = 'RESTORATION' | 'RISK' | 'PRIORITY' | 'CLUSTERING' | null;

interface WhyModalProps {
  type: WhyModalType;
  data: any;
  onClose: () => void;
}

export const WhyModal: React.FC<WhyModalProps> = ({ type, data, onClose }) => {
  if (!type || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-sm">
      <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-charcoal-800 bg-charcoal-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-electric-500/15 text-electric-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                MATHEMATICAL EXPLAINABILITY PANEL
              </div>
              <h2 className="text-base font-bold text-slate-100">
                {type === 'RESTORATION' && 'Why This Restoration Path Was Selected'}
                {type === 'RISK' && `Why Asset '${data.asset_code || ''}' Has Risk Score ${data.total_risk_score || ''}`}
                {type === 'PRIORITY' && `Why Report Has Priority Score ${data.priority_score || ''}`}
                {type === 'CLUSTERING' && `Why Incident Reports Were Clustered`}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. RESTORATION EXPLANATION */}
          {type === 'RESTORATION' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-charcoal-800/80 border border-charcoal-700 text-xs font-mono text-slate-300">
                <span className="text-electric-400 font-bold">Composite Cost Formulation:</span>
                <p className="mt-1 text-slate-400">
                  Cost(e) = α·R_norm + β·(Load/Capacity) + γ·D_norm (α=0.4, β=0.4, γ=0.2)
                </p>
                <p className="mt-1 text-[11px] text-slate-500 italic">
                  *Composite simulation cost for distribution FLISR; thermal capacity margin verified on all candidate branches.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                  Evaluated Candidate Paths ({data.details?.candidates_evaluated?.length || 0})
                </h3>
                <div className="space-y-2.5">
                  {data.details?.candidates_evaluated?.map((cand: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        cand.feasible
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-red-950/20 border-red-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-slate-200">
                          Candidate #{idx + 1}: Tie Switch {cand.tie_edge_code}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cand.feasible
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {cand.feasible ? 'FEASIBLE' : 'REJECTED'}
                        </span>
                      </div>

                      <div className="mt-2 text-xs font-mono text-slate-400">
                        Path: {cand.path_nodes?.join(' ➔ ')}
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                        <div>Composite Cost: <span className="font-bold text-electric-400">{cand.composite_cost}</span></div>
                        <div>Thermal Margin: <span className="font-bold">{cand.capacity_margin_mw} MW</span></div>
                      </div>

                      {!cand.feasible && cand.rejection_reason && (
                        <div className="mt-2 p-2 rounded bg-red-950/40 border border-red-900/60 text-[11px] text-red-300">
                          Rejection Reason: {cand.rejection_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {data.details?.selection_rationale && (
                <div className="p-3.5 rounded-xl bg-charcoal-800/80 border border-charcoal-700">
                  <div className="text-xs font-mono font-bold text-electric-400 mb-1">
                    Selection Verdict:
                  </div>
                  <div className="text-xs text-slate-300">{data.details.selection_rationale}</div>
                </div>
              )}
            </div>
          )}

          {/* 2. ASSET RISK EXPLANATION */}
          {type === 'RISK' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-charcoal-800/80 border border-charcoal-700 text-xs font-mono text-slate-400">
                Formula: {data.formula}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left text-slate-300">
                  <thead className="bg-charcoal-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">Risk Factor</th>
                      <th className="p-2.5">Raw Metric</th>
                      <th className="p-2.5">Weight</th>
                      <th className="p-2.5 rounded-r-lg">Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal-800">
                    {data.factors &&
                      Object.entries(data.factors).map(([k, v]: [string, any]) => (
                        <tr key={k}>
                          <td className="p-2.5 font-bold text-slate-200 capitalize">
                            {k.replace('_', ' ')}
                            <div className="text-[10px] text-slate-500 font-normal">{v.description}</div>
                          </td>
                          <td className="p-2.5">{v.raw_score}</td>
                          <td className="p-2.5">{v.weight}</td>
                          <td className="p-2.5 text-amber-400 font-bold">+{v.weighted_contrib}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. INCIDENT PRIORITY EXPLANATION */}
          {type === 'PRIORITY' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-charcoal-800/80 border border-charcoal-700 text-xs font-mono text-slate-400">
                Formula: {data.formula}
              </div>

              <div className="space-y-2.5">
                {data.factors &&
                  Object.entries(data.factors).map(([k, v]: [string, any]) => (
                    <div key={k} className="p-3 rounded-xl bg-charcoal-800/60 border border-charcoal-700/60 flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="font-bold text-slate-200 capitalize">{k.replace('_', ' ')}</div>
                        <div className="text-[11px] text-slate-400">{v.detail}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-400 font-bold">+{v.weighted_contrib}</div>
                        <div className="text-[10px] text-slate-500">Weight: {v.weight}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 4. CLUSTERING EXPLANATION */}
          {type === 'CLUSTERING' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-charcoal-800/80 border border-charcoal-700 text-xs font-mono text-slate-400">
                Rule Applied: {data.clustering_rule_applied}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase">
                  Pairwise Document Similarity Matrix
                </h4>
                {data.pairwise_similarities?.map((m: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-charcoal-800/60 border border-charcoal-700/60 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Report #{m.report_a_id} ↔ Report #{m.report_b_id}</span>
                      <span className="text-emerald-400 font-bold">Similarity: {(m.similarity * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Spatial Distance: {m.spatial_distance} units | Method: {m.method}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
