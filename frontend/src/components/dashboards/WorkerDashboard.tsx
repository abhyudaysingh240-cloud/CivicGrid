import React, { useState, useEffect } from 'react';
import { Assignment } from '../../types';
import { apiRequest } from '../../api/client';
import {
  Wrench,
  CheckCircle2,
  Navigation,
  MapPin,
  Clock,
  Filter,
  ArrowUpDown,
  Camera,
  FileText,
  AlertTriangle,
  X,
  Check
} from 'lucide-react';

export const WorkerDashboard: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'id'>('date');

  // Resolution Modal State
  const [resolvingTask, setResolvingTask] = useState<Assignment | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [proofPhotoName, setProofPhotoName] = useState<string | null>(null);
  const [submittingResolution, setSubmittingResolution] = useState(false);

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

  const handleUpdateStatus = async (id: number, newStatus: string, notesText?: string) => {
    try {
      await apiRequest(`/civic/assignments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          notes: notesText || undefined,
        }),
      });
      loadMyWork();
    } catch (err: any) {
      alert(`Error updating assignment: ${err.message}`);
    }
  };

  const handleConfirmResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTask) return;
    setSubmittingResolution(true);
    try {
      const fullNotes = [
        resolutionNotes.trim(),
        proofPhotoName ? `[Attached completion photo: ${proofPhotoName}]` : ''
      ].filter(Boolean).join(' ');

      await apiRequest(`/civic/assignments/${resolvingTask.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'COMPLETED',
          notes: fullNotes || 'Completed and verified by field staff.',
        }),
      });
      setResolvingTask(null);
      setResolutionNotes('');
      setProofPhotoName(null);
      loadMyWork();
    } catch (err: any) {
      alert(`Failed to resolve assignment: ${err.message}`);
    } finally {
      setSubmittingResolution(false);
    }
  };

  // Filter & Sort Logic
  const filteredTasks = assignments
    .filter((task) => {
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'PENDING') return task.status === 'ASSIGNED' || task.status === 'EN_ROUTE';
      if (filterStatus === 'IN_PROGRESS') return task.status === 'ON_SITE' || task.status === 'EN_ROUTE';
      if (filterStatus === 'COMPLETED') return task.status === 'COMPLETED';
      return task.status === filterStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
      }
      return b.id - a.id;
    });

  const pendingCount = assignments.filter((a) => a.status !== 'COMPLETED').length;
  const completedCount = assignments.filter((a) => a.status === 'COMPLETED').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--coral-strong)] text-white shadow-md">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-dark-primary)]">Field Operations & Work Orders</h1>
            <p className="text-xs text-[var(--text-dark-muted)]">
              Assigned municipal maintenance tasks, emergency dispatches, and repair workflows.
            </p>
          </div>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)] text-xs font-mono">
            <span className="text-[var(--text-dark-muted)]">Active / Pending: </span>
            <span className="font-bold text-amber-400">{pendingCount}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)] text-xs font-mono">
            <span className="text-[var(--text-dark-muted)]">Completed: </span>
            <span className="font-bold text-emerald-400">{completedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-xl p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-[var(--text-dark-muted)]" />
          <span className="text-xs font-mono text-[var(--text-dark-muted)] mr-1">Status:</span>
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                filterStatus === st
                  ? 'bg-[var(--coral-strong)] text-white shadow-sm'
                  : 'bg-[var(--surface-dark-2)] text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-dark-muted)]" />
          <span className="text-xs font-mono text-[var(--text-dark-muted)]">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-lg px-2.5 py-1 text-xs font-mono text-[var(--text-dark-primary)] focus:outline-none"
          >
            <option value="date">Most Recent</option>
            <option value="id">Task ID</option>
          </select>
        </div>
      </div>

      {/* Work Orders Grid Feed */}
      {loading ? (
        <div className="text-xs font-mono text-[var(--text-dark-muted)] py-12 text-center">Loading assigned tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-dark-2)] flex items-center justify-center mx-auto text-[var(--text-dark-muted)]">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-dark-primary)]">No tasks found matching filter</h3>
          <p className="text-xs text-[var(--text-dark-muted)]">All assigned work orders are up to date. Stay on standby for dispatch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-dark-primary)]">WORK ORDER #{task.id}</span>
                    {task.report_id && (
                      <span className="px-2 py-0.5 rounded bg-[var(--surface-dark-2)] text-[var(--text-dark-muted)] border border-[var(--border-dark)]">
                        Report #{task.report_id}
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : task.status === 'ON_SITE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>

                {/* Dispatch Notes / Problem Context */}
                {task.notes && (
                  <div className="p-3 rounded-xl bg-[var(--surface-dark-2)] text-xs text-[var(--text-dark-primary)] border border-[var(--border-dark)]">
                    <span className="text-[10px] font-mono text-[var(--text-dark-muted)] block mb-1">TASK INSTRUCTIONS:</span>
                    {task.notes}
                  </div>
                )}

                <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-dark-muted)]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Assigned: {new Date(task.assigned_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Progress Action Controls */}
              <div className="pt-3 border-t border-[var(--border-dark)] space-y-2">
                <div className="text-[10px] font-mono text-[var(--text-dark-muted)] uppercase">FIELD PROGRESS ACTIONS</div>
                <div className="flex flex-wrap gap-2">
                  {task.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handleUpdateStatus(task.id, 'EN_ROUTE')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/40 transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Start Work (En Route)</span>
                    </button>
                  )}

                  {task.status === 'EN_ROUTE' && (
                    <button
                      onClick={() => handleUpdateStatus(task.id, 'ON_SITE')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Arrived On Site</span>
                    </button>
                  )}

                  {task.status !== 'COMPLETED' ? (
                    <button
                      onClick={() => {
                        setResolvingTask(task);
                        setResolutionNotes('');
                        setProofPhotoName(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-all ml-auto"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold py-1">
                      <Check className="w-4 h-4" />
                      <span>Work Verified & Completed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Completion Modal */}
      {resolvingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-sm">
          <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-dark)]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-dark-primary)]">Complete Work Order #{resolvingTask.id}</h3>
                  <p className="text-[11px] text-[var(--text-dark-muted)]">Record resolution notes and completion verification</p>
                </div>
              </div>
              <button
                onClick={() => setResolvingTask(null)}
                className="p-1 rounded-lg text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)] hover:bg-[var(--surface-dark-2)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmResolution} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dark-muted)] mb-1">
                  RESOLUTION WORK NOTES
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe repair actions taken (e.g., replaced 15A fuse, cleared debris, restored feeder line)..."
                  className="w-full bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-xl p-2.5 text-xs text-[var(--text-dark-primary)] focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dark-muted)] mb-1">
                  PROOF OF WORK PHOTO (OPTIONAL)
                </label>
                <label className="flex flex-col items-center justify-center p-4 border border-dashed border-[var(--border-dark)] hover:border-emerald-400/60 rounded-xl cursor-pointer bg-[var(--surface-dark-2)] transition-all">
                  <Camera className="w-5 h-5 text-[var(--text-dark-muted)] mb-1" />
                  <span className="text-xs text-[var(--text-dark-primary)] font-medium">
                    {proofPhotoName || 'Upload completion photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setProofPhotoName(file.name);
                    }}
                  />
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingTask(null)}
                  className="btn btn-secondary flex-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className="btn btn-primary flex-1 text-xs gap-2 bg-emerald-600 hover:bg-emerald-500"
                >
                  <Check className="w-4 h-4" />
                  {submittingResolution ? 'Submitting...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
