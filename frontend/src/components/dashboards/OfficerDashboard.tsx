import React, { useState, useEffect } from 'react';
import { CitizenReport, IncidentCluster, InfrastructureAsset, User } from '../../types';
import { apiRequest } from '../../api/client';
import { Users, AlertTriangle, Layers, ShieldAlert, CheckCircle2, XCircle, Send, HelpCircle } from 'lucide-react';

interface OfficerDashboardProps {
  onOpenWhyClustering: (clusterId: number) => void;
  onOpenWhyPriority: (reportId: number) => void;
  onOpenWhyRisk: (assetId: number) => void;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  onOpenWhyClustering,
  onOpenWhyPriority,
  onOpenWhyRisk,
}) => {
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [clusters, setClusters] = useState<IncidentCluster[]>([]);
  const [assets, setAssets] = useState<InfrastructureAsset[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispatchModal, setDispatchModal] = useState<{ reportId?: number; clusterId?: number } | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      apiRequest<CitizenReport[]>('/civic/reports'),
      apiRequest<IncidentCluster[]>('/civic/clusters'),
      apiRequest<InfrastructureAsset[]>('/civic/assets'),
      apiRequest<User[]>('/admin/users').catch(() => []),
    ])
      .then(([reps, cls, asts, usrs]) => {
        setReports(reps);
        setClusters(cls);
        setAssets(asts);
        setWorkers(usrs.filter((u) => u.role === 'FIELD_WORKER'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (reportId: number, newStatus: string) => {
    try {
      await apiRequest(`/civic/reports/${reportId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleDispatch = async () => {
    if (!dispatchModal || !selectedWorkerId) return;
    try {
      await apiRequest('/civic/assignments', {
        method: 'POST',
        body: JSON.stringify({
          report_id: dispatchModal.reportId,
          cluster_id: dispatchModal.clusterId,
          assigned_to_user_id: Number(selectedWorkerId),
          notes: dispatchNotes,
        }),
      });
      setDispatchModal(null);
      setSelectedWorkerId('');
      setDispatchNotes('');
      loadData();
      alert('Field crew dispatched successfully.');
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Open Incident Reports</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">
            {reports.filter((r) => r.status !== 'RESOLVED' && r.status !== 'REJECTED').length}
          </div>
        </div>

        <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase">
            <Layers className="w-4 h-4 text-electric-400" />
            <span>Active Incident Clusters</span>
          </div>
          <div className="text-2xl font-bold font-mono text-electric-400 mt-2">
            {clusters.filter((c) => c.status === 'OPEN').length}
          </div>
        </div>

        <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>High Risk Assets</span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
            {assets.filter((a) => a.current_risk_level === 'HIGH' || a.current_risk_level === 'CRITICAL').length}
          </div>
        </div>
      </div>

      {/* Clustered Incidents Section */}
      <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-electric-500/15 text-electric-400">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              CLUSTERED INCIDENTS (TF-IDF & SPATIAL AGGREGATION)
            </h3>
          </div>
        </div>

        {clusters.length === 0 ? (
          <div className="text-xs text-slate-500 font-mono py-4 text-center">
            No incident clusters formed yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {clusters.map((c) => (
              <div
                key={c.id}
                className="bg-charcoal-800/80 border border-charcoal-700/80 rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-slate-200">{c.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-electric-500/20 text-electric-300">
                    {c.report_count} Reports
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-charcoal-700">
                  <span>Priority Score: {c.priority_score.toFixed(1)} / 100</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenWhyClustering(c.id)}
                      className="flex items-center gap-1 text-[10px] text-electric-400 hover:text-white bg-electric-500/15 px-2 py-0.5 rounded border border-electric-500/30 transition-all"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Why Clustered?</span>
                    </button>
                    <button
                      onClick={() => setDispatchModal({ clusterId: c.id })}
                      className="text-[10px] font-bold text-white bg-electric-500 hover:bg-electric-400 px-2 py-0.5 rounded transition-all"
                    >
                      Dispatch Crew
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incident Triage Queue Table */}
      <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
          ALL CITIZEN INCIDENT REPORTS
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left text-slate-300">
            <thead className="bg-charcoal-800 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3 rounded-l-lg">ID / Category</th>
                <th className="p-3">Description</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3 rounded-r-lg">Officer Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-800">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-charcoal-800/40 transition-all">
                  <td className="p-3 font-bold text-slate-200">
                    #{r.id} <span className="text-electric-400 uppercase">{r.category}</span>
                  </td>
                  <td className="p-3 max-w-xs truncate text-slate-300">{r.description}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-amber-400">{r.priority_score.toFixed(0)}</span>
                      <button
                        onClick={() => onOpenWhyPriority(r.id)}
                        className="text-[10px] text-electric-400 hover:underline"
                      >
                        [Why?]
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : r.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {r.status === 'SUBMITTED' && (
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'VERIFIED')}
                          className="px-2 py-1 rounded bg-electric-500/20 text-electric-300 hover:bg-electric-500/30 text-[10px]"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => setDispatchModal({ reportId: r.id })}
                        className="px-2 py-1 rounded bg-charcoal-700 hover:bg-charcoal-600 text-slate-200 text-[10px]"
                      >
                        Assign
                      </button>
                      {r.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'RESOLVED')}
                          className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px]"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Field Crew Modal */}
      {dispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-sm">
          <div className="bg-charcoal-900 border border-charcoal-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-mono font-bold text-slate-100 uppercase">
              Dispatch Field Crew to Incident
            </h3>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Select Field Worker
              </label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-electric-400"
              >
                <option value="">Choose worker...</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.username} ({w.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Dispatch Notes / Work Order Instructions
              </label>
              <textarea
                rows={3}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Check physical feeder lines, inspect tie switch insulator..."
                className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-electric-400 resize-none font-sans"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDispatchModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:bg-charcoal-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatch}
                disabled={!selectedWorkerId}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-electric-500 hover:bg-electric-400 text-white disabled:opacity-40"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
