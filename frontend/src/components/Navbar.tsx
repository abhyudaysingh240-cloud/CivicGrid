import React, { useState } from 'react';
import { User, Role } from '../types';
import { LogOut, LogIn, User as UserIcon, ChevronDown, Grid, Settings } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeRole: Role;
  onLogout: () => void;
  onOpenLogin: () => void;
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
  currentUser, activeRole, onLogout, onOpenLogin, dark = false
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isGrid = activeRole === 'ADMIN' || activeRole === 'DEPARTMENT_OFFICER';

  const navBg  = isGrid ? 'bg-[var(--espresso-deep)] border-[var(--border-dark)]' : 'bg-[var(--ivory)] border-[var(--stone-border)]';
  const textPrimary = isGrid ? 'text-[var(--text-dark-primary)]' : 'text-[var(--text-primary)]';
  const textMuted = isGrid ? 'text-[var(--text-dark-muted)]' : 'text-[var(--text-muted)]';
  const hoverBg  = isGrid ? 'hover:bg-[var(--surface-dark-2)]' : 'hover:bg-[var(--stone-light)]';

  return (
    <header className={`${navBg} border-b sticky top-0 z-50`} role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-[var(--coral-strong)]">
            <Grid className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className={`font-bold text-base tracking-tight ${textPrimary}`}>CivicGrid</span>
          {isGrid && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--coral-strong)]/20 text-[var(--coral-light)] border border-[var(--coral-strong)]/30">
              GRID COMMAND
            </span>
          )}
        </div>

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
                  <div className={`text-sm font-semibold leading-none ${textPrimary}`}>{currentUser.username}</div>
                  <div className={`text-xs mt-0.5 ${textMuted}`}>{roleLabels[activeRole]}</div>
                </div>
                <span className={`badge ${roleColors[activeRole]} hidden sm:inline-flex`}>
                  {roleLabels[activeRole]}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''} ${textMuted}`} />
              </button>

              {menuOpen && (
                <div
                  className={`absolute right-0 top-full mt-1 w-52 rounded-lg shadow-lg border ${
                    isGrid
                      ? 'bg-[var(--surface-dark-1)] border-[var(--border-dark)]'
                      : 'bg-white border-[var(--stone-border)]'
                  } py-1 z-50`}
                  role="menu"
                  onBlur={() => setMenuOpen(false)}
                >
                  <div className={`px-4 py-2 border-b ${isGrid ? 'border-[var(--border-dark)]' : 'border-[var(--stone-border)]'}`}>
                    <p className={`text-xs font-semibold ${textPrimary}`}>{currentUser.username}</p>
                    <p className={`text-[11px] ${textMuted}`}>{currentUser.email}</p>
                  </div>
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
