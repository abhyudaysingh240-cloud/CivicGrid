import React, { useState, useEffect } from 'react';
import { AuditLog, User } from '../../types';
import { apiRequest } from '../../api/client';
import { Shield, Key, Search, Users, Activity } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterAction, setFilterAction] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAdminData = () => {
    setLoading(true);
    Promise.all([
      apiRequest<AuditLog[]>('/admin/audit-logs'),
      apiRequest<User[]>('/admin/users'),
    ])
      .then(([l, u]) => {
        setLogs(l);
        setUsers(u);
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
      alert(`User role updated to ${newRole}.`);
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  const filteredLogs = logs.filter((l) =>
    filterAction ? l.action.toLowerCase().includes(filterAction.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      {/* User Management Section */}
      <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-electric-500/15 text-electric-400">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            SYSTEM USERS & ROLE-BASED ACCESS CONTROL (RBAC)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left text-slate-300">
            <thead className="bg-charcoal-800 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3 rounded-l-lg">User ID</th>
                <th className="p-3">Username</th>
                <th className="p-3">Email</th>
                <th className="p-3">Current Role</th>
                <th className="p-3 rounded-r-lg">Modify Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-charcoal-800/40">
                  <td className="p-3">#{u.id}</td>
                  <td className="p-3 font-bold text-slate-200">{u.username}</td>
                  <td className="p-3 text-slate-400">{u.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-electric-500/20 text-electric-300 font-bold">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      className="bg-charcoal-800 border border-charcoal-700 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none"
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

      {/* Immutable Audit Log Section */}
      <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-electric-500/15 text-electric-400">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              IMMUTABLE AUDIT LOG TRAIL
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by action (e.g. FAULT, LOGIN)..."
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs font-mono text-left text-slate-300">
            <thead className="bg-charcoal-800 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target</th>
                <th className="p-3">Result</th>
                <th className="p-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-charcoal-800/40">
                  <td className="p-3 text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-3 font-bold text-slate-200">{log.actor_username}</td>
                  <td className="p-3 text-electric-400 font-bold">{log.action}</td>
                  <td className="p-3 text-slate-400">
                    {log.resource_type}:{log.resource_id}
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
                  <td className="p-3 text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
