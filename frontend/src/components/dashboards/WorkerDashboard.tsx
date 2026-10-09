import React, { useState, useEffect } from 'react';
import { Assignment } from '../../types';
import { apiRequest } from '../../api/client';
import {
  Wrench,
  CheckCircle2,
  Navigation,
  MapPin,
  Clock,
  ExternalLink,
  Filter,
  ArrowUpDown,
  Camera,
  FileText,
  AlertTriangle,
  X,
  Check,
  Compass
} from 'lucide-react';

interface WorkerDashboardProps {
  initialTab?: 'assigned' | 'completed';
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ initialTab = 'assigned' }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'assigned' | 'completed'>(initialTab);
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('priority');

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

  // Helper to construct Google Maps direction link
  const getGoogleMapsUrl = (task: Assignment) => {
    if (task.report?.x_coord && task.report?.y_coord) {
      return `https://www.google.com/maps/search/?api=1&query=${task.report.x_coord},${task.report.y_coord}`;
    }
    const locationQuery = task.report?.category || 'Civic Infrastructure Location';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`;
  };

  const activeTasks = assignments.filter((a) => a.status !== 'COMPLETED');
  const completedTasks = assignments.filter((a) => a.status === 'COMPLETED');

  const displayedTasks = (activeTab === 'assigned' ? activeTasks : completedTasks).sort((a, b) => {
    if (sortBy === 'priority') {
      const pA = a.report?.severity || 0;
      const pB = b.report?.severity || 0;
      return pB - pA;
    }
    return new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--coral-strong)] text-white shadow-md">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-dark-primary)]">Field Operations Command</h1>
            <p className="text-xs text-[var(--text-dark-muted)]">
              Assigned municipal maintenance tasks, emergency dispatches, and live repair updates.
            </p>
          </div>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              activeTab === 'assigned'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                : 'bg-[var(--surface-dark-2)] border-[var(--border-dark)] text-[var(--text-dark-muted)]'
            }`}
          >
            <span>My Active Tasks: </span>
            <span className="font-bold text-amber-400">{activeTasks.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              activeTab === 'completed'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                : 'bg-[var(--surface-dark-2)] border-[var(--border-dark)] text-[var(--text-dark-muted)]'
            }`}
          >
            <span>Completed Jobs: </span>
            <span className="font-bold text-emerald-400">{completedTasks.length}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-xl p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'assigned'
                ? 'bg-[var(--coral-strong)] text-white shadow-sm'
                : 'text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)]'
            }`}
          >
            My Assigned Tasks ({activeTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'completed'
                ? 'bg-[var(--coral-strong)] text-white shadow-sm'
                : 'text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)]'
            }`}
          >
            Completed Jobs ({completedTasks.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-dark-muted)]" />
          <span className="text-xs font-mono text-[var(--text-dark-muted)]">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-lg px-2.5 py-1 text-xs font-mono text-[var(--text-dark-primary)] focus:outline-none"
          >
            <option value="priority">Highest Severity</option>
            <option value="date">Most Recent</option>
          </select>
        </div>
      </div>

      {/* Task Cards Grid */}
      {loading ? (
        <div className="text-xs font-mono text-[var(--text-dark-muted)] py-12 text-center">Loading task dispatch feed...</div>
      ) : displayedTasks.length === 0 ? (
        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-dark-2)] flex items-center justify-center mx-auto text-[var(--text-dark-muted)]">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-dark-primary)]">
            {activeTab === 'assigned' ? 'No active tasks assigned' : 'No completed jobs recorded yet'}
          </h3>
          <p className="text-xs text-[var(--text-dark-muted)]">
            {activeTab === 'assigned'
              ? 'You are all caught up! Stay on standby for new municipal dispatches.'
              : 'Tasks marked resolved will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedTasks.map((task) => {
            const report = task.report;
            const locationDisplay =
              report?.x_coord && report?.y_coord
                ? `Coordinates: ${report.x_coord.toFixed(4)}, ${report.y_coord.toFixed(4)}`
                : 'Assigned Urban Zone';

            return (
              <div
                key={task.id}
                className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Work Order ID & Severity Badge */}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-dark-primary)]">WORK ORDER #{task.id}</span>
                      {report && (
                        <span className="px-2 py-0.5 rounded bg-[var(--surface-dark-2)] text-[var(--coral-light)] border border-[var(--border-dark)] capitalize">
                          {report.category}
                        </span>
                      )}
                    </div>
                    {report && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          report.severity >= 4
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : report.severity === 3
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        Severity {report.severity}/5
                      </span>
                    )}
                  </div>

                  {/* Location & Address Header with Google Maps CTA */}
                  <div className="p-3 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold truncate">{locationDisplay}</span>
                    </div>
                    <a
                      href={getGoogleMapsUrl(task)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-mono font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-lg border border-sky-500/30 transition-all shrink-0"
                    >
                      <Compass className="w-3 h-3" />
                      <span>Open Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  {/* Citizen Description & Task Instructions */}
                  {report && (
                    <div className="text-xs text-[var(--text-dark-secondary)] font-sans">
                      <span className="text-[10px] font-mono text-[var(--text-dark-muted)] block mb-0.5 uppercase">
                        CITIZEN REPORT DESCRIPTION:
                      </span>
                      <p className="line-clamp-2">{report.description}</p>
                    </div>
                  )}

                  {task.notes && (
                    <div className="p-2.5 rounded-lg bg-[var(--surface-dark-3)] text-xs text-[var(--text-dark-primary)] border border-[var(--border-dark)]">
                      <span className="text-[10px] font-mono text-[var(--text-dark-muted)] block mb-0.5">DISPATCH INSTRUCTIONS:</span>
                      {task.notes}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-dark-muted)]">
                    <Clock className="w-3 h-3" />
                    <span>Assigned: {new Date(task.assigned_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Status Switcher Action Controls */}
                <div className="pt-3 border-t border-[var(--border-dark)] space-y-2">
                  <div className="text-[10px] font-mono text-[var(--text-dark-muted)] uppercase">STATUS CONTROLS</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {task.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/40 transition-all"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Start Work (In Progress)</span>
                      </button>
                    )}

                    {task.status === 'IN_PROGRESS' && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        In Progress
                      </span>
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
                        <span>Work Completed & Closed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
                  placeholder="Describe repair actions taken (e.g., cleared debris, replaced switch, repaired streetlight)..."
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
