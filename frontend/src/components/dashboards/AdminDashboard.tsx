import React, { useState, useEffect } from 'react';
import { AuditLog, User, SystemHealth, CitizenReport, Assignment } from '../../types';
import { apiRequest } from '../../api/client';
import { StatusBadge } from '../ui/StatusBadge';
import {
  Shield,
  Key,
  Search,
  Users,
  Activity,
  Database,
  Radio,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Filter,
  Send,
  Eye,
  X
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'users' | 'audit'>('overview');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [filterAction, setFilterAction] = useState('');
  const [searchReport, setSearchReport] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');
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
      alert(`Work order successfully dispatched for Report #${assigningReport.id}!`);
    } catch (err: any) {
      alert(`Failed to assign worker: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  // KPI Calculations
  const totalReports = reports.length;
  const pendingReports = reports.filter((r) => r.status === 'SUBMITTED' || r.status === 'VERIFIED').length;
  const inProgressReports = reports.filter((r) => r.status === 'IN_PROGRESS').length;
  const resolvedReports = reports.filter((r) => r.status === 'RESOLVED').length;

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      searchReport === '' ||
      r.description.toLowerCase().includes(searchReport.toLowerCase()) ||
      r.category.toLowerCase().includes(searchReport.toLowerCase()) ||
      String(r.id).includes(searchReport);
    const matchesStatus = reportStatusFilter === 'ALL' || r.status === reportStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredLogs = logs.filter((l) =>
    filterAction ? l.action.toLowerCase().includes(filterAction.toLowerCase()) : true
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dark-muted)] uppercase">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Total Reports</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-dark-primary)] mt-2">
            {totalReports}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Verified database records</div>
        </div>

        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dark-muted)] uppercase">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Pending / Triage</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {pendingReports}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Awaiting dispatch or review</div>
        </div>

        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dark-muted)] uppercase">
            <Wrench className="w-4 h-4 text-sky-400" />
            <span>Active In Progress</span>
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-2">
            {inProgressReports}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Crew dispatched on-site</div>
        </div>

        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dark-muted)] uppercase">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Resolved Issues</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {resolvedReports}
          </div>
          <div className="text-[10px] text-[var(--text-dark-muted)] mt-1">Repairs completed & verified</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex rounded-xl bg-[var(--surface-dark-1)] p-1.5 border border-[var(--border-dark)] overflow-x-auto">
        {[
          { id: 'overview' as const, label: 'Master Reports', icon: FileText },
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

      {/* TAB 1: Master Reports Table */}
      {activeTab === 'overview' && (
        <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-dark-primary)]">
                MASTER INCIDENT REPORT REGISTRY & STAFF ASSIGNMENT
              </h3>
              <p className="text-[11px] text-[var(--text-dark-muted)]">
                Manage citizen submissions, change lifecycle states, and dispatch field crews.
              </p>
            </div>

            {/* Filters */}
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
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left text-[var(--text-dark-secondary)]">
              <thead className="bg-[var(--surface-dark-2)] text-[var(--text-dark-muted)] uppercase text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-lg">ID</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Summary / Description</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-dark)]">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-[var(--text-dark-muted)]">
                      No reports found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((rep) => (
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
                      <td className="p-3">
                        <span
                          className={`font-bold ${
                            rep.severity >= 4
                              ? 'text-red-400'
                              : rep.severity === 3
                              ? 'text-amber-400'
                              : 'text-emerald-400'
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
                      <td className="p-3 text-[10px] text-[var(--text-dark-muted)]">
                        {new Date(rep.created_at).toLocaleDateString()}
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
                              <span>Dispatch</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
                USER ROLES & ACCESS CONTROL MANAGEMENT
              </h3>
              <p className="text-[11px] text-[var(--text-dark-muted)]">
                Promote citizens to field staff or administrators with real-time server-side enforcement.
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
                  <th className="p-3">Active Role</th>
                  <th className="p-3 rounded-r-lg">Role Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-dark)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--surface-dark-2)]/50 transition-colors">
                    <td className="p-3">#{u.id}</td>
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
                  CRYPTOGRAPHIC IMMUTABLE AUDIT LOG
                </h3>
                <p className="text-[11px] text-[var(--text-dark-muted)]">
                  Tamper-evident log of all sensitive security events and operational dispatches.
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-dark-muted)]" />
              <input
                type="text"
                placeholder="Filter by action..."
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
                  <th className="p-3">Log ID</th>
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
                  <p className="text-[11px] text-[var(--text-dark-muted)]">Assign Report #{assigningReport.id} to field crew</p>
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
                  ASSIGN TO FIELD WORKER
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[var(--surface-dark-2)] border border-[var(--border-dark)] rounded-xl p-2.5 text-xs font-mono text-[var(--text-dark-primary)] focus:outline-none focus:border-sky-400"
                  required
                >
                  <option value="">Select available field crew...</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.username} ({w.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-dark-muted)] mb-1">
                  WORK INSTRUCTIONS / NOTES
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
