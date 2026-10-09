import React, { useState } from 'react';
import { User, Role } from '../types';
import { Navbar } from './Navbar';
import {
  ShieldAlert,
  Layers,
  Home,
  Users,
  Grid,
  Activity,
  Menu,
  X,
  Radio,
  FileText
} from 'lucide-react';

interface AppShellProps {
  currentUser: User | null;
  activeRole: Role;
  setActiveRole: (role: Role) => void;
  onLogout: () => void;
  onOpenLogin: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentUser,
  activeRole,
  setActiveRole,
  onLogout,
  onOpenLogin,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isGridOperator = activeRole === 'ADMIN' || activeRole === 'DEPARTMENT_OFFICER';

  // Role navigation items available based on authenticated credentials
  // Role is enforced server-side via /auth/me; only staff roles can switch views
  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'DEPARTMENT_OFFICER';

  const roleNavItems: { role: Role; label: string; icon: React.ReactNode; description: string }[] = [
    {
      role: 'CITIZEN',
      label: 'Citizen Portal',
      icon: <Home className="w-4 h-4" aria-hidden="true" />,
      description: 'Report issues & view community status',
    },
    {
      role: 'FIELD_WORKER',
      label: 'Field Dispatch',
      icon: <Layers className="w-4 h-4" aria-hidden="true" />,
      description: 'Assigned repairs & status updates',
    },
    {
      role: 'DEPARTMENT_OFFICER',
      label: 'Dept. Operations',
      icon: <ShieldAlert className="w-4 h-4" aria-hidden="true" />,
      description: 'Prioritization & incident triage',
    },
    {
      role: 'ADMIN',
      label: 'Grid Command & Admin',
      icon: <Users className="w-4 h-4" aria-hidden="true" />,
      description: 'Self-healing grid, telemetry & audit logs',
    },
  ];

  // Available roles: staff can preview worker/citizen or manage system; citizen only accesses Citizen
  const allowedRoles = isStaff
    ? roleNavItems
    : currentUser?.role === 'FIELD_WORKER'
    ? roleNavItems.filter((i) => i.role === 'FIELD_WORKER' || i.role === 'CITIZEN')
    : roleNavItems.filter((i) => i.role === 'CITIZEN');

  const containerBg = isGridOperator ? 'bg-[var(--bg-dark)]' : 'bg-[var(--bg-light)]';
  const sidebarBg = isGridOperator
    ? 'bg-[var(--surface-dark-1)] border-[var(--border-dark)] text-[var(--text-dark-primary)]'
    : 'bg-[var(--ivory)] border-[var(--stone-border)] text-[var(--text-primary)]';

  return (
    <div className={`min-h-screen ${containerBg} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeRole={activeRole}
        onLogout={onLogout}
        onOpenLogin={onOpenLogin}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Sidebar Toggle Button */}
        <div className="lg:hidden fixed bottom-4 left-4 z-40">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="btn btn-primary shadow-lg p-3 rounded-full flex items-center justify-center min-w-[48px] min-h-[48px]"
            aria-label={sidebarOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <aside
          className={`
            fixed lg:static top-14 bottom-0 left-0 z-30 w-64 border-r ${sidebarBg}
            flex flex-col p-4 transition-transform duration-200 ease-out
            ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          `}
          role="navigation"
          aria-label="Role and workspace views"
        >
          <div className="mb-4">
            <span className="text-[11px] font-mono uppercase tracking-wider opacity-70 block mb-2">
              Operational Workspace
            </span>
            <div className="space-y-1">
              {allowedRoles.map((item) => {
                const isActive = activeRole === item.role;
                return (
                  <button
                    key={item.role}
                    onClick={() => {
                      setActiveRole(item.role);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full text-left flex items-start gap-3 p-2.5 rounded-lg text-sm transition-colors
                      ${
                        isActive
                          ? isGridOperator
                            ? 'bg-[var(--surface-dark-3)] text-[var(--coral-light)] font-semibold border border-[var(--border-dark)]'
                            : 'bg-[var(--coral-light)] text-[var(--coral-strong)] font-semibold border border-[var(--coral-mid)]/40'
                          : isGridOperator
                          ? 'hover:bg-[var(--surface-dark-2)] text-[var(--text-dark-secondary)]'
                          : 'hover:bg-[var(--stone-light)] text-[var(--text-secondary)]'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="mt-0.5 shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="truncate leading-snug">{item.label}</div>
                      <div className="text-[11px] opacity-75 truncate">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Environmental Status / Grid Mode indicator */}
          <div className="mt-auto pt-4 border-t border-inherit">
            <div
              className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                isGridOperator
                  ? 'bg-[var(--surface-dark-2)] text-[var(--text-dark-secondary)]'
                  : 'bg-[var(--stone-light)] text-[var(--text-primary)]'
              }`}
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  isGridOperator ? 'text-[var(--accent-cyan)] animate-pulse' : 'text-[var(--sage-text)]'
                }`}
                aria-hidden="true"
              />
              <span className="truncate">
                {isGridOperator ? 'Grid SCADA Live Telemetry' : 'Civic Services Portal'}
              </span>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main Content Area */}
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full focus:outline-none"
          tabIndex={-1}
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
};

