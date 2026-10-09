import React, { useState, useEffect } from 'react';
import { AuditLog, User, SystemHealth, CitizenReport, Assignment } from '../../types';
import { apiRequest } from '../../api/client';
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
  Compass
} from 'lucide-react';

interface AdminDashboardProps {
  initialTab?: 'triage' | 'users' | 'audit';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab = 'triage' }) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'users' | 'audit'>(initialTab);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [reports, setReports] = useState<CitizenReport[]>([]);
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
    Promise.all([
      apiRequest<AuditLog[]>('/admin/audit-logs').catch(() => []),
      apiRequest<User[]>('/admin/users').catch(() => []),
      apiRequest<SystemHealth>('/admin/system-health').catch(() => null),
      apiRequest<CitizenReport[]>('/civic/reports').catch(() => []),
      apiRequest<User[]>('/civic/assignments/workers').catch(() => []),
    ])
      .then(([l, u, h, r, w]) => {
        setLogs(l);
        setUsers(u);
        setHealth(h);
        setReports(r);
        setWorkers(w);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdminData();
  }, []);

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

  const handleUpdateReportStatus = async (reportId: number, newStatus: string) => {
    try {
      await apiRequest(`/civic/reports/${reportId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadAdminData();
    } catch (err: any) {
      alert(`Failed to update report status: ${err.message}`);
    }
  };

  const handleAssignWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningReport || !selectedWorkerId) return;
    setAssigning(true);
    try {
      await apiRequest('/civic/assignments', {
        method: 'POST',
        body: JSON.stringify({
          report_id: assigningReport.id,
          assigned_to_user_id: Number(selectedWorkerId),
          notes: assignmentNotes.trim() || `Assigned to investigate ${assigningReport.category} report.`,
        }),
      });
      setAssigningReport(null);
      setSelectedWorkerId('');
      setAssignmentNotes('');
      loadAdminData();
      alert(`Work order dispatched to field worker for Report #${assigningReport.id}!`);
    } catch (err: any) {
      alert(`Failed to assign worker: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  // Top KPI Metrics
  const pendingCount = reports.filter((r) => r.status === 'SUBMITTED' || r.status === 'VERIFIED').length;
  const highPriorityCount = reports.filter((r) => r.severity >= 4).length;
  const inProgressCount = reports.filter((r) => r.status === 'IN_PROGRESS').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;

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
      {/* Top Metric/KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dark-muted)] uppercase">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Total Pending Issues</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {pendingCount}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Awaiting triage & worker dispatch</div>
        </div>

        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dark-muted)] uppercase">
            <Flame className="w-4 h-4 text-red-400" />
            <span>High Priority Alerts</span>
          </div>
          <div className="text-2xl font-bold font-mono text-red-400 mt-2">
            {highPriorityCount}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Severity 4 & 5 emergency issues</div>
        </div>

        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dark-muted)] uppercase">
            <Wrench className="w-4 h-4 text-sky-400" />
            <span>Active Work Orders</span>
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-2">
            {inProgressCount}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Crews currently dispatched on-site</div>
        </div>

        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dark-muted)] uppercase">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Resolved Issues</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {resolvedCount}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Repairs completed & verified</div>
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
        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-dark-primary)]">
                PRIORITY REPORT TRIAGE & WORKER DISPATCH QUEUE
              </h3>
              <p className="text-[11px] text-[var(--text-dark-muted)]">
                Live citizen incident reports sorted by severity and submission date. Assign field staff in real time.
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
                        <td className="p-3 max-w-xs truncate text-[var(--text-dark-primary)]" title={rep.description}>
                          {rep.description}
                        </td>
                        <td className="p-3 text-[11px] text-[var(--text-dark-muted)]">
                          {coordsStr}
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
                <span className="text-[10px] text-[var(--text-dark-muted)] uppercase">DESCRIPTION</span>
                <p className="text-slate-100 font-sans">{viewingReport.description}</p>
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
    </div>
  );
};
