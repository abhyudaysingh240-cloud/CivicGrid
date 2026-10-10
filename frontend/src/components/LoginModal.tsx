import React, { useState } from 'react';
import { User, Role } from '../types';
import { localLogin, localRegister, persistSession, LocalUser } from '../hooks/useReports';
import { Lock, X, AlertCircle, Home, HardHat, ShieldCheck, ShieldAlert } from 'lucide-react';

interface LoginModalProps {
  onSuccess: (user: User) => void;
  onClose: () => void;
}

type RegistrableRole = 'CITIZEN' | 'FIELD_WORKER' | 'ADMIN';

const roleOptions: { role: RegistrableRole; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { role: 'CITIZEN',      label: 'Citizen',      desc: 'Public portal',  icon: <Home className="w-4 h-4" />,       color: 'emerald' },
  { role: 'FIELD_WORKER', label: 'Field Worker', desc: 'Field dispatch', icon: <HardHat className="w-4 h-4" />,    color: 'amber' },
  { role: 'ADMIN',        label: 'Admin',         desc: 'Command center', icon: <ShieldCheck className="w-4 h-4" />, color: 'rose' },
];

const roleColorMap: Record<string, { border: string; bg: string; text: string; activeBorder: string; activeBg: string; activeText: string }> = {
  emerald: { border: 'border-charcoal-700', bg: 'bg-charcoal-800', text: 'text-slate-400', activeBorder: 'border-emerald-500', activeBg: 'bg-emerald-500/15', activeText: 'text-emerald-300' },
  amber:   { border: 'border-charcoal-700', bg: 'bg-charcoal-800', text: 'text-slate-400', activeBorder: 'border-amber-400',   activeBg: 'bg-amber-400/15',   activeText: 'text-amber-300' },
  rose:    { border: 'border-charcoal-700', bg: 'bg-charcoal-800', text: 'text-slate-400', activeBorder: 'border-rose-500',    activeBg: 'bg-rose-500/15',    activeText: 'text-rose-300' },
};

/** Convert a LocalUser to the App-level User type */
const toAppUser = (lu: LocalUser): User => ({
  id: lu.id,
  username: lu.username,
  email: lu.email,
  role: lu.role as Role,
  is_active: lu.is_active,
  created_at: lu.created_at,
});

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess, onClose }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<RegistrableRole>('CITIZEN');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (tab === 'login') {
        // Offline-first: try local auth first, fall back to backend
        let localUser: LocalUser | null = null;
        try {
          localUser = localLogin(username, password);
        } catch {
          // not a local user — could still be on backend
        }

        if (localUser) {
          persistSession(localUser);
          onSuccess(toAppUser(localUser));
        } else {
          // Attempt backend (may fail if offline — that's fine for demo)
          const { apiRequest } = await import('../api/client');
          const user = await apiRequest<User>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username_or_email: username, password }),
          });
          onSuccess(user);
        }
      } else {
        // Registration: always local-first
        const newLocalUser = localRegister(username, email, password, selectedRole);
        persistSession(newLocalUser);
        onSuccess(toAppUser(newLocalUser));
      }
    } catch (err: any) {
      setError(err.message || (tab === 'login' ? 'Authentication failed. Please verify credentials.' : 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  const cfg = roleColorMap[roleOptions.find(r => r.role === selectedRole)?.color || 'emerald'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-sm">
      <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl auth-panel-enter auth-terminal">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-charcoal-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-electric-500/15 text-electric-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 key={tab} className="text-sm font-bold text-slate-100 typewriter-heading">
                {tab === 'login' ? 'Sign In to CivicGrid' : 'Register New Account'}
              </h2>
              <p className="text-[11px] text-slate-400">Role-bound authenticated workspace</p>
            </div>
          </div>
          <button id="login-modal-close" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Demo credentials hint */}
        <div className="p-2.5 rounded-xl bg-electric-500/8 border border-electric-500/20 text-[10px] font-mono text-slate-400 leading-relaxed">
          <span className="text-electric-300 font-bold">Demo accounts: </span>
          admin / admin123 &nbsp;·&nbsp; worker1 / worker123 &nbsp;·&nbsp; citizen1 / citizen123
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-charcoal-800 p-1 border border-charcoal-700">
          <button type="button" onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${tab === 'login' ? 'bg-electric-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
            Sign In
          </button>
          <button type="button" onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${tab === 'register' ? 'bg-electric-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
            Register
          </button>
        </div>

        {/* Role selector (register only) */}
        {tab === 'register' && (
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              REGISTER AS ROLE
              <span className="ml-2 text-slate-500 font-normal normal-case">(determines your dashboard access)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map(({ role, label, desc, icon, color }) => {
                const c = roleColorMap[color];
                const isActive = selectedRole === role;
                return (
                  <button key={role} type="button" id={`role-select-${role.toLowerCase()}`}
                    onClick={() => setSelectedRole(role)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${isActive ? `${c.activeBg} ${c.activeBorder} shadow-sm` : `${c.bg} ${c.border} hover:border-charcoal-500`}`}>
                    <div className={`mb-1 ${isActive ? c.activeText : 'text-slate-500'}`}>{icon}</div>
                    <div className={`text-xs font-bold font-mono ${isActive ? c.activeText : 'text-slate-300'}`}>{label}</div>
                    <div className="text-[10px] text-slate-500">{desc}</div>
                  </button>
                );
              })}
            </div>
            {/* Role access info */}
            <div className="mt-2 p-2 rounded-lg bg-charcoal-800 text-[10px] font-mono text-slate-400">
              {selectedRole === 'CITIZEN' && '🏠 Access: Citizen complaint portal only'}
              {selectedRole === 'FIELD_WORKER' && '🔧 Access: Field operations — your assigned work orders only'}
              {selectedRole === 'ADMIN' && '🛡️ Access: Full command center — admin + grid topology + dispatch'}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="auth-field-group auth-field-1">
            <label htmlFor="login-username" className="block text-xs font-mono text-slate-300 mb-1">
              {tab === 'login' ? 'USERNAME OR EMAIL' : 'USERNAME'}
            </label>
            <input id="login-username" type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-electric-400 transition-colors"
              autoComplete="username"
              placeholder={tab === 'login' ? 'e.g. admin or citizen1' : 'Choose a username'}
              required />
          </div>

          {tab === 'register' && (
            <div className="auth-field-group auth-field-2">
              <label htmlFor="register-email" className="block text-xs font-mono text-slate-300 mb-1">EMAIL ADDRESS</label>
              <input id="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-electric-400 transition-colors"
                autoComplete="email" placeholder="your@email.com" required />
            </div>
          )}

          <div className={`auth-field-group ${tab === 'register' ? 'auth-field-3' : 'auth-field-2'}`}>
            <label htmlFor="login-password" className="block text-xs font-mono text-slate-300 mb-1">PASSWORD</label>
            <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-electric-400 transition-colors"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••" required />
          </div>

          <button id="login-submit" type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-electric-500 hover:bg-electric-400 text-white transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 auth-field-submit">
            {loading
              ? (tab === 'login' ? 'Authenticating...' : 'Creating account...')
              : tab === 'login'
              ? 'Sign In'
              : `Create ${selectedRole === 'CITIZEN' ? 'Citizen' : selectedRole === 'FIELD_WORKER' ? 'Worker' : 'Admin'} Account`}
          </button>
        </form>
      </div>
    </div>
  );
};
