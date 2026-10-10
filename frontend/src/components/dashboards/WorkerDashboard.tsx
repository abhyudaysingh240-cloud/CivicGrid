import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { useReports, updateReportStatus, assignWorkerToReport } from '../../hooks/useReports';
import {
  Wrench,
  CheckCircle2,
  Navigation,
  MapPin,
  Clock,
  ExternalLink,
  ArrowUpDown,
  RefreshCw,
  Compass,
  Inbox,
  Check,
  X
} from 'lucide-react';

interface WorkerDashboardProps {
  initialTab?: 'queue' | 'assigned' | 'completed';
  currentUser?: User | null;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ initialTab = 'queue', currentUser }) => {
  const { reports } = useReports();
  const [activeTab, setActiveTab] = useState<'queue' | 'assigned' | 'completed'>(initialTab);
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('priority');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Resolution Modal State
  const [resolvingTask, setResolvingTask] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [proofPhotoName, setProofPhotoName] = useState<string | null>(null);
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Auto-refresh poll every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      window.dispatchEvent(new Event('civicgrid_live_data_sync'));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new Event('civicgrid_live_data_sync'));
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // ── 1. Unassigned / Submitted Work Queue ────────────────────────────────
  const unassignedTasks = reports.filter((item: any) => {
    const isUnassigned = !item.assignedWorkerId && !item.assignedTo;
    const isSubmitted = item.status === 'SUBMITTED' || item.status === 'UNASSIGNED';
    const isNotDone = item.status !== 'COMPLETED' && item.status !== 'RESOLVED';
    return (isSubmitted || isUnassigned) && isNotDone;
  });

  // ── 2. Filter reports assigned to THIS worker ───────────────────────────
  const myAssignedTasks = reports.filter((item: any) => {
    if (!item.assignedTo && !item.assignedWorkerEmail && !item.assignedWorkerId) return false;
    const userEmail = currentUser?.email?.toLowerCase().trim();
    const userName = currentUser?.username?.toLowerCase().trim();
    const userId = currentUser?.id;
    const taskEmail = item.assignedWorkerEmail?.toLowerCase().trim();
    const taskUser = item.assignedTo?.toLowerCase().trim();
    const taskUserId = item.assignedWorkerId;

    return (
      (taskEmail && userEmail && taskEmail === userEmail) ||
      (taskUser && userName && taskUser === userName) ||
      (taskUser && userEmail && taskUser.includes(userEmail)) ||
      (taskUserId !== null && taskUserId !== undefined && taskUserId === userId)
    );
  });

  const activeTasks = myAssignedTasks.filter((a: any) => a.status !== 'COMPLETED' && a.status !== 'RESOLVED');
  const completedTasks = myAssignedTasks.filter((a: any) => a.status === 'COMPLETED' || a.status === 'RESOLVED');

  const handleUpdateStatus = (reportId: string | number, newStatus: string) => {
    updateReportStatus(reportId, newStatus);
  };

  const handleClaimTask = (task: any) => {
    const workerInfo = currentUser || {
      id: 3,
      username: 'worker1',
      email: 'worker@civicgrid.internal',
      role: 'FIELD_WORKER',
    };
    assignWorkerToReport(task.id, workerInfo);
    updateReportStatus(task.id, 'IN_PROGRESS');
    setActiveTab('assigned');
  };

  const handleConfirmResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTask) return;
    setSubmittingResolution(true);
    updateReportStatus(resolvingTask.id, 'RESOLVED');
    setResolvingTask(null);
    setResolutionNotes('');
    setProofPhotoName(null);
    setSubmittingResolution(false);
  };

  // Helper to construct exact Google Maps location link
  const getGoogleMapsUrl = (task: any) => {
    const lat = task.x_coord !== null && task.x_coord !== undefined ? task.x_coord : task.latitude;
    const lng = task.y_coord !== null && task.y_coord !== undefined ? task.y_coord : task.longitude;
    if (lat && lng) {
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.locationLabel || task.area || task.category || 'Roorkee')}`;
  };

  const currentList =
    activeTab === 'queue'
      ? unassignedTasks
      : activeTab === 'assigned'
      ? activeTasks
      : completedTasks;

  const displayedTasks = [...currentList].sort((a: any, b: any) => {
    if (sortBy === 'priority') {
      return (b.severity || 0) - (a.severity || 0);
    }
    return new Date(b.submittedAt || b.created_at || 0).getTime() - new Date(a.submittedAt || a.created_at || 0).getTime();
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
              Incoming citizen complaints, real-time dispatches, and work order tracking.
            </p>
          </div>
        </div>

        {/* Quick KPI Badges & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              activeTab === 'queue'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-sm'
                : 'bg-[var(--surface-dark-2)] border-[var(--border-dark)] text-[var(--text-dark-muted)]'
            }`}
          >
            <span>Unassigned Queue: </span>
            <span className="font-bold text-blue-400">{unassignedTasks.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              activeTab === 'assigned'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                : 'bg-[var(--surface-dark-2)] border-[var(--border-dark)] text-[var(--text-dark-muted)]'
            }`}
          >
            <span>My Active: </span>
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
            <span>Resolved: </span>
            <span className="font-bold text-emerald-400">{completedTasks.length}</span>
          </button>

          <button
            onClick={handleManualRefresh}
            className="p-2 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)] text-[var(--text-dark-muted)] hover:text-white transition-all ml-1"
            title="Refresh reports"
            aria-label="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-xl p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)]'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Unassigned Work Queue ({unassignedTasks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('assigned')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'assigned'
                ? 'bg-[var(--coral-strong)] text-white shadow-sm'
                : 'text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>My Active Tasks ({activeTasks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Resolved Jobs ({completedTasks.length})</span>
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
      {displayedTasks.length === 0 ? (
        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-dark-2)] flex items-center justify-center mx-auto text-[var(--text-dark-muted)]">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-dark-primary)]">
            {activeTab === 'queue'
              ? 'No unassigned complaints in queue'
              : activeTab === 'assigned'
              ? 'No active tasks assigned'
              : 'No resolved jobs recorded yet'}
          </h3>
          <p className="text-xs text-[var(--text-dark-muted)]">
            {activeTab === 'queue'
              ? 'All citizen incident reports have been dispatched.'
              : activeTab === 'assigned'
              ? 'Claim an issue from the Unassigned Queue or wait for dispatcher assignment.'
              : 'Tasks marked resolved will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedTasks.map((task: any) => {
            const lat = task.x_coord !== null && task.x_coord !== undefined ? Number(task.x_coord) : (task.latitude !== null && task.latitude !== undefined ? Number(task.latitude) : null);
            const lng = task.y_coord !== null && task.y_coord !== undefined ? Number(task.y_coord) : (task.longitude !== null && task.longitude !== undefined ? Number(task.longitude) : null);
            const hasCoords = lat !== null && lng !== null;
            const addressText = task.locationLabel || task.area || 'Roorkee Infrastructure Zone';

            return (
              <div
                key={task.id}
                className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Work Order ID & Severity Badge */}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[var(--text-dark-primary)]">REPORT #{task.id}</span>
                      {task.category && (
                        <span className="px-2 py-0.5 rounded bg-[var(--surface-dark-2)] text-[var(--coral-light)] border border-[var(--border-dark)] capitalize text-[10px]">
                          {task.category}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          task.status === 'SUBMITTED'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : task.status === 'ASSIGNED'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {task.status || 'SUBMITTED'}
                      </span>
                    </div>

                    {task.severity && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          task.severity >= 4
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : task.severity === 3
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        Severity {task.severity}/5
                      </span>
                    )}
                  </div>

                  {/* EXACT Location with Coordinates & Open in Maps Link */}
                  <div className="p-3 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)] space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 text-xs font-mono text-slate-200">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-slate-100">{addressText}</div>
                          <div className="text-[11px] text-[var(--text-dark-muted)]">
                            {hasCoords ? `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}` : 'Coordinates: Sector Area'}
                          </div>
                        </div>
                      </div>

                      <a
                        href={getGoogleMapsUrl(task)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-mono font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1.5 rounded-lg border border-sky-500/30 transition-all shrink-0"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Open in Maps</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <div className="text-xs text-[var(--text-dark-secondary)] font-sans">
                      <span className="text-[10px] font-mono text-[var(--text-dark-muted)] block mb-0.5 uppercase">
                        CITIZEN DESCRIPTION:
                      </span>
                      <p className="line-clamp-3 leading-relaxed">{task.description}</p>
                      <div className="mt-1.5 text-[10px] text-[var(--text-dark-muted)] font-mono">
                        Reporter: <span className="text-sky-400 font-bold">{task.username || 'Citizen'}</span>
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-dark-muted)]">
                    <Clock className="w-3 h-3" />
                    <span>Submitted: {new Date(task.submittedAt || task.created_at || Date.now()).toLocaleString()}</span>
                  </div>
                </div>

                {/* Status Switcher & Assignment Action Controls */}
                <div className="pt-3 border-t border-[var(--border-dark)] space-y-2">
                  <div className="text-[10px] font-mono text-[var(--text-dark-muted)] uppercase">WORKER ACTIONS</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Action in Unassigned Queue */}
                    {activeTab === 'queue' && (
                      <button
                        onClick={() => handleClaimTask(task)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Claim & Start Task (In Progress)</span>
                      </button>
                    )}

                    {/* Action in Assigned Queue */}
                    {activeTab === 'assigned' && task.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/40 transition-all"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Start Work (In Progress)</span>
                      </button>
                    )}

                    {activeTab === 'assigned' && task.status === 'IN_PROGRESS' && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        In Progress
                      </span>
                    )}

                    {activeTab === 'assigned' && (
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
                    )}

                    {/* Completed View */}
                    {activeTab === 'completed' && (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold py-1">
                        <Check className="w-4 h-4" />
                        <span>Work Completed & Resolved</span>
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
                  <h3 className="text-sm font-bold text-[var(--text-dark-primary)]">Resolve Report #{resolvingTask.id}</h3>
                  <p className="text-[11px] text-[var(--text-dark-muted)]">Record resolution and close out work order</p>
                </div>
              </div>
              <button
                onClick={() => setResolvingTask(null)}
                className="p-1 rounded-lg text-[var(--text-dark-muted)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmResolution} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dark-muted)] mb-1">
                  RESOLUTION NOTES (OPTIONAL)
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Replaced 11kV fuse and restored secondary feeder load."
                  className="w-full bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-xl p-3 text-xs text-[var(--text-dark-primary)] focus:outline-none focus:border-emerald-500 h-24 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingTask(null)}
                  className="flex-1 py-2 rounded-xl text-xs font-mono border border-[var(--border-dark)] text-[var(--text-dark-muted)] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className="flex-1 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50"
                >
                  {submittingResolution ? 'Saving...' : 'Confirm Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
