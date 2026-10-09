import React, { useState } from 'react';
import { apiRequest } from '../api/client';
import { User } from '../types';
import { Lock, X, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  onSuccess: (user: User) => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess, onClose }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'CITIZEN' | 'FIELD_WORKER' | 'ADMIN'>('CITIZEN');
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
        const user = await apiRequest<User>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username_or_email: username,
            password: password,
          }),
        });
        onSuccess(user);
      } else {
        // Register flow with selected role
        await apiRequest<User>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            username: username,
            email: email,
            password: password,
            role: selectedRole,
          }),
        });
        // Auto-login after registration
        const user = await apiRequest<User>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username_or_email: username,
            password: password,
          }),
        });
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || (tab === 'login' ? 'Authentication failed. Please verify credentials.' : 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-sm">
      <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-charcoal-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-electric-500/15 text-electric-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                {tab === 'login' ? 'Sign In to CivicGrid' : 'Register New Account'}
              </h2>
              <p className="text-[11px] text-slate-400">Role-based authenticated workspace</p>
            </div>
          </div>
          <button
            id="login-modal-close"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector: Sign In vs Register */}
        <div className="flex rounded-xl bg-charcoal-800 p-1 border border-charcoal-700">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              tab === 'login'
                ? 'bg-electric-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              tab === 'register'
                ? 'bg-electric-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {/* Role Selector */}
        <div>
          <label className="block text-xs font-mono text-slate-300 mb-1.5">
            SELECT ROLE
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { role: 'CITIZEN' as const, label: 'Citizen', desc: 'Public portal' },
              { role: 'FIELD_WORKER' as const, label: 'Worker', desc: 'Field staff' },
              { role: 'ADMIN' as const, label: 'Admin', desc: 'Management' },
            ].map(({ role, label, desc }) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`p-2 rounded-xl text-left border transition-all ${
                  selectedRole === role
                    ? 'bg-electric-500/20 border-electric-400 text-slate-100 shadow-sm'
                    : 'bg-charcoal-800 border-charcoal-700 text-slate-400 hover:text-slate-200 hover:border-charcoal-600'
                }`}
              >
                <div className="text-xs font-bold font-mono">{label}</div>
                <div className="text-[10px] text-slate-400">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="login-username" className="block text-xs font-mono text-slate-300 mb-1">
              {tab === 'login' ? 'USERNAME OR EMAIL' : 'USERNAME'}
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-electric-400"
              autoComplete="username"
              required
            />
          </div>

          {tab === 'register' && (
            <div>
              <label htmlFor="register-email" className="block text-xs font-mono text-slate-300 mb-1">
                EMAIL ADDRESS
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-electric-400"
                autoComplete="email"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="login-password" className="block text-xs font-mono text-slate-300 mb-1">PASSWORD</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-electric-400"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-electric-500 hover:bg-electric-400 text-white transition-all shadow-md disabled:opacity-50"
          >
            {loading ? (tab === 'login' ? 'Authenticating...' : 'Registering...') : (tab === 'login' ? 'Sign In' : `Create ${selectedRole === 'CITIZEN' ? 'Citizen' : selectedRole === 'FIELD_WORKER' ? 'Worker' : 'Admin'} Account`)}
          </button>
        </form>
      </div>
    </div>
  );
};
