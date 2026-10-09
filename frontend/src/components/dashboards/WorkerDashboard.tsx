import React, { useState, useEffect } from 'react';
import { Assignment } from '../../types';
import { apiRequest } from '../../api/client';
import { Wrench, CheckCircle2, Navigation, MapPin, Clock } from 'lucide-react';

export const WorkerDashboard: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<{ [id: number]: string }>({});

  const loadMyWork = () => {
    setLoading(true);
    apiRequest<Assignment[]>('/civic/assignments/my')
      .then(setAssignments)
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMyWork();
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await apiRequest(`/civic/assignments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          notes: notes[id] || undefined,
        }),
      });
      loadMyWork();
    } catch (err: any) {
      alert(`Error updating assignment: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="p-2.5 rounded-xl bg-electric-500/15 text-electric-400">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">Field Crew Work Orders</h2>
          <p className="text-xs text-slate-400">
            Assigned emergency dispatches, repair inspections, and switchgear restorations.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-xs font-mono text-slate-400 py-6 text-center">Loading work orders...</div>
      ) : assignments.length === 0 ? (
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-2xl p-8 text-center text-xs text-slate-400">
          No work orders currently assigned to you. Stay on standby for dispatch.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((task) => (
            <div
              key={task.id}
              className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-200">WORK ORDER #{task.id}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    task.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : task.status === 'ON_SITE'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-electric-500/20 text-electric-300'
                  }`}
                >
                  {task.status}
                </span>
              </div>

              {task.notes && (
                <div className="p-3 rounded-xl bg-charcoal-800 text-xs text-slate-300 font-sans">
                  <span className="text-[10px] font-mono text-slate-400 block mb-0.5">DISPATCH NOTES:</span>
                  {task.notes}
                </div>
              )}

              {/* Progress Action Buttons */}
              <div className="pt-2 border-t border-charcoal-800 space-y-2">
                <div className="text-[10px] font-mono text-slate-400 uppercase">UPDATE FIELD STATUS</div>
                <div className="flex flex-wrap gap-2">
                  {task.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handleUpdateStatus(task.id, 'EN_ROUTE')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-electric-500/20 text-electric-300 hover:bg-electric-500/30 border border-electric-500/40"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>En Route</span>
                    </button>
                  )}

                  {task.status === 'EN_ROUTE' && (
                    <button
                      onClick={() => handleUpdateStatus(task.id, 'ON_SITE')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>On Site</span>
                    </button>
                  )}

                  {task.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
