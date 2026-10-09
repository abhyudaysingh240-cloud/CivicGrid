import React from 'react';
import { User, Role } from '../types';
import { Zap, ShieldCheck, UserCheck, LogOut, Radio } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeRole: Role;
  onChangeRole: (role: Role) => void;
  onLogout: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeRole,
  onChangeRole,
  onLogout,
  onOpenLogin,
}) => {
  return (
    <header className="bg-charcoal-900/90 border-b border-charcoal-700/80 sticky top-0 z-30 backdrop-blur-md px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-electric-500 text-white shadow-lg shadow-electric-500/25">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white">CivicGrid</h1>
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-electric-500/15 text-electric-300 border border-electric-500/30">
                <Radio className="w-3 h-3 text-electric-400 animate-pulse" />
                DIGITAL TWIN SIMULATION
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Intelligent Urban Infrastructure Monitoring & Self-Healing Grid
            </p>
          </div>
        </div>

        {/* Right side controls: Role switch and user profile */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Quick Role Switcher for Demo Evaluation */}
          <div className="flex items-center gap-1.5 bg-charcoal-950 p-1 rounded-xl border border-charcoal-700">
            <span className="text-[10px] font-mono text-slate-400 px-2 uppercase hidden md:inline">
              OPERATIONAL VIEW:
            </span>
            {(['ADMIN', 'DEPARTMENT_OFFICER', 'FIELD_WORKER', 'CITIZEN'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => onChangeRole(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all ${
                  activeRole === r
                    ? 'bg-electric-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r === 'DEPARTMENT_OFFICER' ? 'OFFICER' : r === 'FIELD_WORKER' ? 'WORKER' : r}
              </button>
            ))}
          </div>

          {/* User Status / Login */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden lg:block">
                <div className="text-xs font-mono font-bold text-slate-200">{currentUser.username}</div>
                <div className="text-[10px] font-mono text-electric-400">{currentUser.role}</div>
              </div>
              <button
                onClick={onLogout}
                title="Log out"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all border border-charcoal-700"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-electric-500 hover:bg-electric-400 text-white transition-all shadow-md"
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
