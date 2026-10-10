import React, { useState, useEffect } from 'react';
import { ClusterRanking } from './ClusterRanking';
import { AuditLog, User, SystemHealth, CitizenReport, Assignment } from '../../types';
import { apiRequest } from '../../api/client';
import { useReports, assignWorkerToReport, getWorkers, updateReportStatus } from '../../hooks/useReports';
import {
  Shield,
  Search,
  Users,
  Activity,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Filter,
  Send,
  Eye,
  X,
  Flame,
  ArrowUpDown,
  Compass,
  MapPin,
  ExternalLink,
  RefreshCw,
  Inbox
} from 'lucide-react';

interface AdminDashboardProps {
  initialTab?: 'triage' | 'users' | 'audit';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab = 'triage' }) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'users' | 'audit'>(initialTab);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const { reports } = useReports();
  const [workers, setWorkers] = useState<User[]>([]);
  const [filterAction, setFilterAction] = useState('');
  const [searchReport, setSearchReport] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'severity' | 'date'>('severity');
  const [loading, setLoading] = useState(false);

  // Assign Worker Modal State
  const [assigningReport, setAssigningReport] = useState<CitizenReport | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | ''>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Detail Modal State
  const [viewingReport, setViewingReport] = useState<CitizenReport | null>(null);

  const loadAdminData = () => {
    setLoading(true);
    // Always seed workers from local registry first (guaranteed offline-safe)
    const localWorkers = getWorkers();
    setWorkers(localWorkers as unknown as User[]);

    Promise.all([
      apiRequest<AuditLog[]>('/admin/audit-logs').catch(() => []),
      apiRequest<User[]>('/admin/users').catch(() => []),
      apiRequest<SystemHealth>('/admin/system-health').catch(() => null),
      apiRequest<User[]>('/civic/assignments/workers').catch(() => []),
    ])
      .then(([l, u, h, w]) => {
        setLogs(l);
        setUsers(u);
        setHealth(h);
        // Prefer server workers; merge with local registry workers
        const serverWorkers = w.length > 0 ? w : (u as User[]).filter(usr => usr.role === 'FIELD_WORKER');
        setWorkers(serverWorkers.length > 0 ? serverWorkers : (localWorkers as unknown as User[]));
      })
      .finally(() => setLoading(false));
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAdminData();
    const interval = setInterval(() => {
      window.dispatchEvent(new Event('civicgrid_live_data_sync'));
      loadAdminData();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new Event('civicgrid_live_data_sync'));
    loadAdminData();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      loadAdminData();
      alert(`User #${userId} role updated to ${newRole}.`);
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  const handleUpdateReportStatus = async (reportId: number | string, newStatus: string) => {
    try {
      updateReportStatus(reportId, newStatus);
      await apiRequest(`/civic/reports/${reportId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      }).catch(() => {});
      loadAdminData();
    } catch (err: any) {
      console.warn(`Local status update applied:`, err);
    }
  };

  const handleAssignWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningReport || !selectedWorkerId) return;
    setAssigning(true);
    try {
      const worker = workers.find(w => w.id === Number(selectedWorkerId));
      if (worker) {
        // Write directly to the production data bus (works offline)
        assignWorkerToReport(assigningReport.id, worker);
      }
      setAssigningReport(null);
      setSelectedWorkerId('');
      setAssignmentNotes('');
    } catch (err: any) {
      alert(`Failed to assign worker: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  // Helper for Maps links
  const getMapsUrl = (task: any) => {
    const lat = task.x_coord !== null && task.x_coord !== undefined ? task.x_coord : task.latitude;
    const lng = task.y_coord !== null && task.y_coord !== undefined ? task.y_coord : task.longitude;
    if (lat && lng) {
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.locationLabel || task.area || task.category || 'Roorkee')}`;
  };

  // Helper for relative time elapsed
  const getTimeSince = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // ── Top KPI Metrics computed live from the same report data ──────────
  const totalReportsCount = reports.length;
  const submittedCount = reports.filter((r) => r.status === 'SUBMITTED' || r.status === 'UNASSIGNED' || r.status === 'VERIFIED').length;
  const assignedCount = reports.filter((r) => r.status === 'ASSIGNED').length;
  const inProgressCount = reports.filter((r) => r.status === 'IN_PROGRESS').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED' || r.status === 'COMPLETED').length;
  const remainingCount = totalReportsCount - resolvedCount;

  // Active work orders list (In Progress & Assigned)
  const inProgressAndAssignedReports = reports.filter(
    (r) => r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED'
  );

  // Unassigned / pending reports list (Needs worker dispatch)
  const unassignedReports = reports.filter(
    (r) =>
      (r.status === 'SUBMITTED' ||
        r.status === 'UNASSIGNED' ||
        r.status === 'VERIFIED' ||
        (!r.assignedTo && !r.assignedWorkerId)) &&
      r.status !== 'RESOLVED' &&
      r.status !== 'COMPLETED' &&
      r.status !== 'IN_PROGRESS' &&
      r.status !== 'ASSIGNED' &&
      r.status !== 'REJECTED'
  );

  const getReportLocation = (rep: CitizenReport) => {
    const lat = rep.x_coord ?? (rep as any).latitude ?? (rep as any).lat ?? 29.8543;
    const lng = rep.y_coord ?? (rep as any).longitude ?? (rep as any).lng ?? 77.888;
    const addr = (rep as any).address || (rep as any).location_name || (rep as any).location || 'Roorkee, Uttarakhand';
    const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    return { lat, lng, addr, mapUrl };
  };

  const sortedAndFilteredReports = reports
    .filter((r) => {
      const matchesSearch =
        searchReport === '' ||
        r.description.toLowerCase().includes(searchReport.toLowerCase()) ||
        r.category.toLowerCase().includes(searchReport.toLowerCase()) ||
        String(r.id).includes(searchReport);
      const matchesStatus = reportStatusFilter === 'ALL' || r.status === reportStatusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'severity') {
        if (b.severity !== a.severity) return b.severity - a.severity;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const filteredLogs = logs.filter((l) =>
    filterAction ? l.action.toLowerCase().includes(filterAction.toLowerCase()) : true
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Metric/KPI Bar: 6 live cards including REMAINING */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-dark-muted)] uppercase">
            <span>Total Reports</span>
            <button onClick={handleManualRefresh} title="Refresh Live Data" aria-label="Refresh Live Data" className="text-slate-400 hover:text-white">
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">
            {totalReportsCount}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">All registered complaints</div>
        </div>

        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="text-xs font-mono text-amber-400 uppercase">Submitted / Pending</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {submittedCount}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Awaiting dispatch</div>
        </div>

        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="text-xs font-mono text-purple-400 uppercase">Assigned</div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-2">
            {assignedCount}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Dispatched to crews</div>
        </div>

        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="text-xs font-mono text-sky-400 uppercase">In Progress</div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-2">
            {inProgressCount}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Currently on-site</div>
        </div>

        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="text-xs font-mono text-emerald-400 uppercase">Resolved</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {resolvedCount}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Completed & verified</div>
        </div>

        <div className="bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-4 shadow-xl">
          <div className="text-xs font-mono font-bold text-red-400 uppercase flex items-center justify-between">
            <span>REMAINING</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300">OPEN</span>
          </div>
          <div className="text-2xl font-bold font-mono text-red-400 mt-2">
            {remainingCount}
          </div>
          <div className="text-[10px] text-red-300/80 mt-1">Total minus Resolved</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex rounded-xl bg-[var(--surface-dark-1)] p-1.5 border border-[var(--border-dark)] overflow-x-auto">
        {[
          { id: 'triage' as const, label: 'Priority Triage & Reports', icon: FileText },
          { id: 'users' as const, label: 'User & Staff Management', icon: Users },
          { id: 'audit' as const, label: 'Audit Log Trail', icon: Shield },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
              activeTab === id
                ? 'bg-[var(--coral-strong)] text-white shadow-sm'
                : 'text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)] hover:bg-[var(--surface-dark-2)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: Priority Triage Table */}
      {activeTab === 'triage' && (
        <div className="space-y-6">
          {/* Work in Progress & Pending Dispatch Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Active Work Orders (In Progress & Assigned) */}
            <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-dark)]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-dark-primary)]">
                      Active Work Orders & In Progress
                    </h3>
                    <p className="text-[11px] text-[var(--text-dark-muted)]">
                      Assigned or actively being worked on by field crews
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {inProgressAndAssignedReports.length} Active
                </span>
              </div>

              <div className="mt-3 space-y-2.5 overflow-y-auto max-h-80 pr-1">
                {inProgressAndAssignedReports.length === 0 ? (
                  <div className="py-8 text-center text-xs font-mono text-[var(--text-dark-muted)]">
                    No active assignments or work in progress.
                  </div>
                ) : (
                  inProgressAndAssignedReports.map((rep) => {
                    const loc = getReportLocation(rep);
                    const workerName = rep.assignedTo || rep.assignedWorkerId || 'Dispatched Crew';
                    const isInProgress = rep.status === 'IN_PROGRESS';
                    return (
                      <div
                        key={rep.id}
                        className="p-3 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)] hover:border-sky-500/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[var(--text-dark-primary)]">
                              #{rep.id}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-[var(--surface-dark-3)] text-[var(--coral-light)] border border-[var(--border-dark)]">
                              {rep.category}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                isInProgress
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                  : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              }`}
                            >
                              {rep.status}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--text-dark-muted)] flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            {getTimeSince(rep.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-[var(--text-dark-primary)] mt-1.5 line-clamp-1 font-sans">
                          {rep.description}
                        </p>

                        <div className="mt-2 pt-2 border-t border-[var(--border-dark)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono">
                          <div className="flex items-center gap-1.5 text-purple-300">
                            <Users className="w-3.5 h-3.5 text-purple-400" />
                            <span>Worker: <strong className="text-purple-200">{workerName}</strong></span>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={loc.mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-mono underline decoration-dotted"
                              title={`View ${loc.addr} in Google Maps`}
                            >
                              <MapPin className="w-3 h-3 text-red-400" />
                              <span>{loc.addr.split(',')[0]}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>

                            <button
                              onClick={() => handleUpdateReportStatus(rep.id, 'RESOLVED')}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                              title="Mark issue resolved"
                            >
                              Resolve
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Unassigned / Pending Reports (Awaiting Dispatch) */}
            <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-dark)]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-dark-primary)]">
                      Pending Dispatch Queue
                    </h3>
                    <p className="text-[11px] text-[var(--text-dark-muted)]">
                      Citizen reports awaiting worker assignment
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {unassignedReports.length} Unassigned
                </span>
              </div>

              <div className="mt-3 space-y-2.5 overflow-y-auto max-h-80 pr-1">
                {unassignedReports.length === 0 ? (
                  <div className="py-8 text-center text-xs font-mono text-[var(--text-dark-muted)]">
                    All submitted reports have been dispatched! No pending queue.
                  </div>
                ) : (
                  unassignedReports.map((rep) => {
                    const loc = getReportLocation(rep);
                    return (
                      <div
                        key={rep.id}
                        className="p-3 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)] hover:border-amber-500/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[var(--text-dark-primary)]">
                              #{rep.id}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-[var(--surface-dark-3)] text-[var(--coral-light)] border border-[var(--border-dark)]">
                              {rep.category}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${
                                rep.severity >= 4
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                  : rep.severity === 3
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              Lvl {rep.severity}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--text-dark-muted)] flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            {getTimeSince(rep.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-[var(--text-dark-primary)] mt-1.5 line-clamp-1 font-sans">
                          {rep.description}
                        </p>

                        <div className="mt-2 pt-2 border-t border-[var(--border-dark)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono">
                          <a
                            href={loc.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-mono underline decoration-dotted"
                            title={`View ${loc.addr} in Google Maps`}
                          >
                            <MapPin className="w-3 h-3 text-red-400" />
                            <span>{loc.addr.split(',')[0]} ({loc.lat.toFixed(3)}, {loc.lng.toFixed(3)})</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>

                          <button
                            onClick={() => {
                              setAssigningReport(rep);
                              setSelectedWorkerId(workers[0]?.id || '');
                              setAssignmentNotes('');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 shrink-0"
                          >
                            <Send className="w-3 h-3" />
                            <span>Dispatch Worker</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Full Registry Table & Filters */}
          <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-dark-primary)]">
                  ALL CITIZEN REPORTS & INCIDENT ARCHIVE
                </h3>
                <p className="text-[11px] text-[var(--text-dark-muted)]">
                  Comprehensive master record with real-time status controls and dispatch capabilities.
                </p>
              </div>

              {/* Filters and Search */}
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-dark-muted)]" />
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchReport}
                    onChange={(e) => setSearchReport(e.target.value)}
                    className="w-full bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-dark-primary)] focus:outline-none focus:border-[var(--coral-strong)]"
                  />
                </div>

                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                  className="bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[var(--text-dark-primary)] focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[var(--text-dark-primary)] focus:outline-none"
                >
                  <option value="severity">Highest Severity</option>
                  <option value="date">Most Recent</option>
                </select>
              </div>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left text-[var(--text-dark-secondary)]">
              <thead className="bg-[var(--surface-dark-2)] text-[var(--text-dark-muted)] uppercase text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-lg">Issue ID</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Location / Coords</th>
                  <th className="p-3">Severity (1-5)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 rounded-r-lg text-right">Assign Worker / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-dark)]">
                {sortedAndFilteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-[var(--text-dark-muted)]">
                      No reports found in registry.
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredReports.map((rep) => {
                    const coordsStr =
                      rep.x_coord && rep.y_coord
                        ? `${rep.x_coord.toFixed(3)}, ${rep.y_coord.toFixed(3)}`
                        : 'Zone Pin';

                    return (
                      <tr key={rep.id} className="hover:bg-[var(--surface-dark-2)]/50 transition-colors">
                        <td className="p-3 font-bold text-[var(--text-dark-primary)]">#{rep.id}</td>
                        <td className="p-3 capitalize">
                          <span className="px-2 py-0.5 rounded bg-[var(--surface-dark-2)] border border-[var(--border-dark)] text-[var(--coral-light)]">
                            {rep.category}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs text-[var(--text-dark-primary)]">
                          <div className="text-[10px] font-bold text-sky-400 mb-0.5 font-sans">Reported by: {rep.username || 'Citizen'}</div>
                          <div className="truncate" title={rep.description}>{rep.description}</div>
                        </td>
                        <td className="p-3 text-[11px] text-[var(--text-dark-muted)]">
                          <a
                            href={`https://www.google.com/maps?q=${rep.x_coord ?? (rep as any).latitude ?? 29.8543},${rep.y_coord ?? (rep as any).longitude ?? 77.888}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline decoration-dotted"
                            title="Open GPS coordinates in Google Maps"
                          >
                            <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                            <span>{coordsStr}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                              rep.severity >= 4
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : rep.severity === 3
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            Level {rep.severity}/5
                          </span>
                        </td>
                        <td className="p-3">
                          <select
                            value={rep.status}
                            onChange={(e) => handleUpdateReportStatus(rep.id, e.target.value)}
                            className="bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-lg px-2 py-1 text-[11px] font-mono text-[var(--text-dark-primary)] focus:outline-none"
                          >
                            <option value="SUBMITTED">SUBMITTED</option>
                            <option value="VERIFIED">VERIFIED</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewingReport(rep)}
                              className="p-1.5 rounded-lg bg-[var(--surface-dark-2)] text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)] hover:bg-[var(--surface-dark-3)]"
                              title="View Full Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {rep.status !== 'RESOLVED' && rep.status !== 'REJECTED' && (
                              <button
                                onClick={() => {
                                  setAssigningReport(rep);
                                  setSelectedWorkerId(workers[0]?.id || '');
                                  setAssignmentNotes('');
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30"
                              >
                                <Send className="w-3 h-3" />
                                <span>Dispatch Worker</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* TAB 2: User & Role Management */}
      {activeTab === 'users' && (
        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--coral-strong)] text-white">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-dark-primary)]">
                USER ROLES & STAFF PROMOTION MANAGEMENT
              </h3>
              <p className="text-[11px] text-[var(--text-dark-muted)]">
                Manage registered citizens and promote users to Field Staff or Operations Administrators.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left text-[var(--text-dark-secondary)]">
              <thead className="bg-[var(--surface-dark-2)] text-[var(--text-dark-muted)] uppercase text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-lg">User ID</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Current Role</th>
                  <th className="p-3 rounded-r-lg">Promote / Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-dark)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--surface-dark-2)]/50 transition-colors">
                    <td className="p-3 font-bold text-[var(--text-dark-primary)]">#{u.id}</td>
                    <td className="p-3 font-bold text-[var(--text-dark-primary)]">{u.username}</td>
                    <td className="p-3 text-[var(--text-dark-muted)]">{u.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-[var(--coral-strong)]/20 text-[var(--coral-light)] font-bold">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[var(--text-dark-primary)] focus:outline-none"
                      >
                        <option value="CITIZEN">CITIZEN</option>
                        <option value="FIELD_WORKER">FIELD_WORKER</option>
                        <option value="DEPARTMENT_OFFICER">DEPARTMENT_OFFICER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--coral-strong)] text-white">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-dark-primary)]">
                  IMMUTABLE CRYPTOGRAPHIC AUDIT LOG
                </h3>
                <p className="text-[11px] text-[var(--text-dark-muted)]">
                  Audited record of all dispatches, status changes, and administrative actions.
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-dark-muted)]" />
              <input
                type="text"
                placeholder="Filter action..."
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-dark-primary)] focus:outline-none focus:border-[var(--coral-strong)]"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs font-mono text-left text-[var(--text-dark-secondary)]">
              <thead className="bg-[var(--surface-dark-2)] text-[var(--text-dark-muted)] uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource</th>
                  <th className="p-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-dark)]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--surface-dark-2)]/50 transition-colors">
                    <td className="p-3 text-[var(--text-dark-muted)]">#{log.id}</td>
                    <td className="p-3 text-[10px] text-[var(--text-dark-muted)]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-[var(--text-dark-primary)]">
                      {log.actor_username || 'SYSTEM'}
                    </td>
                    <td className="p-3 text-[var(--coral-light)]">{log.action}</td>
                    <td className="p-3 text-[var(--text-dark-muted)]">
                      {log.resource_type} {log.resource_id ? `#${log.resource_id}` : ''}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.result === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispatch Worker Modal */}
      {assigningReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-sm">
          <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-dark)]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-dark-primary)]">
                    Dispatch Field Worker
                  </h3>
                  <p className="text-[11px] text-[var(--text-dark-muted)]">Assign Report #{assigningReport.id} to active field crew</p>
                </div>
              </div>
              <button
                onClick={() => setAssigningReport(null)}
                className="p-1 rounded-lg text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)] hover:bg-[var(--surface-dark-2)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignWorker} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dark-muted)] mb-1">
                  SELECT REGISTERED FIELD WORKER
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-xl p-2.5 text-xs font-mono text-[var(--text-dark-primary)] focus:outline-none focus:border-sky-400"
                  required
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
                <label className="block text-xs font-mono text-[var(--text-dark-muted)] mb-1">
                  DISPATCH INSTRUCTIONS / TASK NOTES
                </label>
                <textarea
                  rows={3}
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="Specify task instructions or priority repair equipment required..."
                  className="w-full bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-xl p-2.5 text-xs text-[var(--text-dark-primary)] focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningReport(null)}
                  className="btn btn-secondary flex-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedWorkerId}
                  className="btn btn-primary flex-1 text-xs gap-2 bg-sky-600 hover:bg-sky-500"
                >
                  <Send className="w-4 h-4" />
                  {assigning ? 'Dispatching...' : 'Dispatch Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Full Detail Modal */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-sm">
          <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-dark)]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--text-dark-muted)]">
                  INCIDENT REPORT DETAILS
                </span>
                <h3 className="text-base font-bold text-[var(--text-dark-primary)]">
                  #{viewingReport.id} — {viewingReport.category.toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="p-1 rounded-lg text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)] hover:bg-[var(--surface-dark-2)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)] space-y-1">
                <span className="text-[10px] text-[var(--text-dark-muted)] uppercase">CITIZEN DESCRIPTION</span>
                <p className="text-slate-100 font-sans">{viewingReport.description}</p>
                <div className="mt-2 text-[10px] text-[var(--text-dark-muted)] font-mono border-t border-[var(--border-dark)] pt-2">
                  Submitted By: <span className="text-sky-400 font-bold">{viewingReport.username || 'Citizen'}</span> (User ID: {viewingReport.user_id})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)]">
                  <span className="text-[10px] text-[var(--text-dark-muted)] uppercase">STATUS</span>
                  <div className="mt-1 font-bold text-sky-400">{viewingReport.status}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)]">
                  <span className="text-[10px] text-[var(--text-dark-muted)] uppercase">SEVERITY LEVEL</span>
                  <div className="mt-1 font-bold text-amber-400">{viewingReport.severity} / 5</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)]">
                  <span className="text-[10px] text-[var(--text-dark-muted)] uppercase">COORDINATES</span>
                  <div className="mt-1 text-[11px] text-slate-200">
                    {viewingReport.x_coord?.toFixed(4)}, {viewingReport.y_coord?.toFixed(4)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--surface-dark-2)] border border-[var(--border-dark)]">
                  <span className="text-[10px] text-[var(--text-dark-muted)] uppercase">SUBMITTED ON</span>
                  <div className="mt-1 text-[11px] text-slate-200">
                    {new Date(viewingReport.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingReport(null)}
                className="btn btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Problem Hotspots (Ranked) — clustering layer, read-only ── */}
      {/* Remove: delete ClusterRanking.tsx, clusterEngine.ts, cluster-ranking.css and these two lines */}
      <ClusterRanking />
    </div>
  );
};
