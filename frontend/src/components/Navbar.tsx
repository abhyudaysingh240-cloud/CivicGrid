import React, { useState } from 'react';
import { User, Role } from '../types';
import { LogOut, LogIn, User as UserIcon, ChevronDown, ShieldCheck, HardHat, ShieldAlert, Home } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeRole: Role;
  onLogout: () => void;
  onOpenLogin: () => void;
  onSwitchRole?: (role: Role) => void;
  dark?: boolean;
}

const roleLabels: Record<Role, string> = {
  CITIZEN: 'Citizen',
  FIELD_WORKER: 'Field Worker',
  DEPARTMENT_OFFICER: 'Dept. Officer',
  ADMIN: 'Administrator',
};

const roleColors: Record<Role, string> = {
  CITIZEN: 'badge-sage',
  FIELD_WORKER: 'badge-coral',
  DEPARTMENT_OFFICER: 'badge-warning',
  ADMIN: 'badge-faulted',
};


export const Navbar: React.FC<NavbarProps> = ({
  currentUser, activeRole, onLogout, onOpenLogin, onSwitchRole, dark = false
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isGrid = activeRole === 'ADMIN' || activeRole === 'DEPARTMENT_OFFICER';

  const navBg  = isGrid ? 'bg-[var(--espresso-deep)] border-[var(--border-dark)]' : 'bg-[var(--ivory)] border-[var(--stone-border)]';
  const textPrimary = isGrid ? 'text-[var(--text-dark-primary)]' : 'text-[var(--text-primary)]';
  const textMuted = isGrid ? 'text-[var(--text-dark-muted)]' : 'text-[var(--text-muted)]';
  const hoverBg  = isGrid ? 'hover:bg-[var(--surface-dark-2)]' : 'hover:bg-[var(--stone-light)]';
  const menuBg   = isGrid
    ? 'bg-[var(--surface-dark-1)] border-[var(--border-dark)]'
    : 'bg-white border-[var(--stone-border)]';
  const dividerClass = isGrid ? 'border-[var(--border-dark)]' : 'border-[var(--stone-border)]';

  const handleSwitchRole = (role: Role) => {
    if (onSwitchRole) onSwitchRole(role);
    setMenuOpen(false);
  };

  return (
    <header className={`${navBg} border-b sticky top-0 z-50`} role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src="/logo-mark.svg" alt="CivicGrid logo" width="36" height="36" />
          <span className={`font-bold text-base tracking-tight ${textPrimary}`}>CivicGrid</span>
          {isGrid && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--coral-strong)]/20 text-[var(--coral-light)] border border-[var(--coral-strong)]/30">
              GRID COMMAND
            </span>
          )}
        </div>

        {/* Active role pill (always visible) */}
        {currentUser && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-bold"
            style={{
              borderColor: activeRole === 'ADMIN' ? 'rgba(239,68,68,0.4)' :
                           activeRole === 'DEPARTMENT_OFFICER' ? 'rgba(234,179,8,0.4)' :
                           activeRole === 'FIELD_WORKER' ? 'rgba(249,115,22,0.4)' : 'rgba(34,197,94,0.4)',
              background: activeRole === 'ADMIN' ? 'rgba(239,68,68,0.1)' :
                          activeRole === 'DEPARTMENT_OFFICER' ? 'rgba(234,179,8,0.1)' :
                          activeRole === 'FIELD_WORKER' ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)',
              color: activeRole === 'ADMIN' ? '#f87171' :
                     activeRole === 'DEPARTMENT_OFFICER' ? '#fbbf24' :
                     activeRole === 'FIELD_WORKER' ? '#fb923c' : '#4ade80',
            }}
          >
            {activeRole === 'ADMIN' && <ShieldCheck className="w-3 h-3" />}
            {activeRole === 'DEPARTMENT_OFFICER' && <ShieldAlert className="w-3 h-3" />}
            {activeRole === 'FIELD_WORKER' && <HardHat className="w-3 h-3" />}
            {activeRole === 'CITIZEN' && <Home className="w-3 h-3" />}
            {roleLabels[activeRole]} VIEW
          </div>
        )}

        {/* Nav actions */}
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          {!currentUser ? (
            <button
              id="nav-login-btn"
              onClick={onOpenLogin}
              className={`btn btn-primary text-sm px-4`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          ) : (
            <div className="relative">
              <button
                id="nav-profile-btn"
                onClick={() => setMenuOpen(v => !v)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg ${hoverBg} transition-colors min-h-[44px]`}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-label="User menu"
              >
                <div className="w-7 h-7 rounded-full bg-[var(--coral)] flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-[var(--espresso)]" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className={`text-sm font-semibold leading-none ${textPrimary}`}>
                    {currentUser.username} <span className="font-normal opacity-70">|</span> <span className="text-xs font-mono font-bold">{roleLabels[currentUser.role] || currentUser.role}</span>
                  </div>
                  <div className={`text-xs mt-0.5 ${textMuted}`}>{currentUser.email}</div>
                </div>
                <span className={`badge ${roleColors[activeRole] || 'badge-sage'} hidden sm:inline-flex`}>
                  {roleLabels[activeRole] || activeRole}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''} ${textMuted}`} />
              </button>

              {menuOpen && (
                <div
                  className={`absolute right-0 top-full mt-1 w-64 rounded-xl shadow-2xl border ${menuBg} py-1 z-50 overflow-hidden`}
                  role="menu"
                >
                  {/* User info header */}
                  <div className={`px-4 py-3 border-b ${dividerClass}`}>
                    <p className={`text-xs font-bold ${textPrimary}`}>{currentUser.username}</p>
                    <p className={`text-[11px] ${textMuted}`}>{currentUser.email}</p>
                    <p className={`text-[10px] font-mono mt-1 ${textMuted}`}>
                      Registered as: <span className="font-bold">{roleLabels[currentUser.role]}</span>
                    </p>
                  </div>


                  {/* Logout */}
                  <button
                    id="nav-logout-btn"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); onLogout(); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left ${hoverBg} transition-colors ${textPrimary}`}
                  >
                    <LogOut className="w-4 h-4 text-[var(--status-faulted)]" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
