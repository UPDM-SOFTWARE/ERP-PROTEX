import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { ArrowRight, KeyRound, Lock, User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import ErpUsLogo from '../../assets/erpus-logo.png';

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = mode === 'login'
      ? await login(email, password)
      : await register(email, password, accessKey);
    if (!result.success) {
      toast.error(result.error);
    } else if (mode === 'register') {
      toast.success('Cuenta creada exitosamente');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-white grid grid-cols-1 lg:grid-cols-2 overflow-y-auto">
      {/* Left Brand Panel (Full height) */}
      <div className="relative bg-gradient-to-br from-slate-50 via-white to-rose-50/50 border-b lg:border-b-0 lg:border-r border-slate-200/70 p-8 sm:p-12 lg:p-16 flex flex-col items-center justify-between overflow-hidden min-h-[260px] lg:min-h-full">
        {/* Subtle ambient accents */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#B9252B]/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-slate-900/5 blur-3xl" />

        <div className="w-full" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center text-center my-4 lg:my-0"
        >
          <div className="w-44 h-44 sm:w-56 sm:h-56 lg:w-72 lg:h-72 flex items-center justify-center">
            <img
              src={ErpUsLogo}
              alt="ERP US Logo"
              className="w-full h-full object-contain drop-shadow-sm select-none"
            />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-[0.26em] uppercase mt-2">
            Finance & Operations
          </p>
        </motion.div>

        <div className="relative z-10 w-full pt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={14} className="text-[#B9252B]" />
          <span>Encrypted Session · US Operations</span>
        </div>
      </div>

      {/* Right Form Panel (Full height) */}
      <div className="bg-white flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              {mode === 'login'
                ? 'Sign in to access your financial workspace.'
                : 'Enter your credentials and invitation key.'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#B9252B] focus:ring-2 focus:ring-rose-100 focus:bg-white transition-all"
                  placeholder={mode === 'register' ? 'username' : 'admin'}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#B9252B] focus:ring-2 focus:ring-rose-100 focus:bg-white transition-all"
                  placeholder="••••••••"
                  minLength={mode === 'register' ? 6 : undefined}
                  required
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Access Key
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-mono tracking-wider placeholder:text-slate-300 focus:outline-none focus:border-[#B9252B] focus:ring-2 focus:ring-rose-100 focus:bg-white transition-all uppercase"
                    placeholder="PROTEX-XXXX-XXXX"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 bg-[#B9252B] hover:bg-[#9e1e23] text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 group disabled:opacity-50 shadow-md shadow-rose-900/10"
            >
              {loading
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
              {!loading && <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
