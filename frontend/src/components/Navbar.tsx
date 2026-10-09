import React from 'react';
import { User, Role } from '../types';
import { Zap, ShieldCheck, UserCheck, LogOut, Radio } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeRole: Role;
  onLogout: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeRole,
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

        {/* Right side controls: authenticated user profile and login/logout */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {currentUser ? (
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-slate-200">{currentUser.username}</div>
                <div className="text-[10px] font-mono text-electric-400 font-bold uppercase tracking-wider">{currentUser.role}</div>
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
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">Role: CITIZEN</span>
              <button
                onClick={onOpenLogin}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-electric-500 hover:bg-electric-400 text-white transition-all shadow-md"
              >
                Log In
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
