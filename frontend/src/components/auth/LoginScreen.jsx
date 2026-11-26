import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, KeyRound, Lock, User, ShieldCheck, Eye, EyeOff, FileText, BarChart3, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import ErpUsLogo from '../../assets/erpus-logo.png';

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const highlights = [
    { icon: BarChart3, label: 'Real-Time Analytics', desc: 'Cash flow & card balances synced live' },
    { icon: FileText, label: 'Smart Invoicing', desc: 'PDF billing & secure document vault' },
    { icon: Layers, label: 'Team Workspaces', desc: 'Multi-user access with role control' },
  ];

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-white grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
      {/* Left Brand Panel — Executive Dark */}
      <div className="lg:col-span-5 relative bg-slate-950 text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
        {/* Subtle grid & crimson radial glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="pointer-events-none absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-[#B9252B]/25 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-[360px] h-[360px] rounded-full bg-indigo-500/10 blur-[100px]" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#B9252B] animate-pulse" />
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">
              ERP US · Platform
            </span>
          </div>
        </div>

        {/* Center Logo & Headline */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative z-10 my-10 lg:my-0 flex flex-col items-start"
        >
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-white/15 flex items-center justify-center mb-7">
            <img
              src={ErpUsLogo}
              alt="ERP US Logo"
              className="w-full h-full object-contain select-none"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
            Financial control,{' '}
            <span className="text-rose-400">built for speed.</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2.5 max-w-sm leading-relaxed">
            Manage accounts, invoices, receivables, and team operations from one unified workspace.
          </p>

          {/* Compact feature list */}
          <div className="hidden sm:flex flex-col gap-3 mt-8 w-full max-w-sm">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#B9252B]/20 border border-[#B9252B]/30 text-rose-400 flex items-center justify-center shrink-0">
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">{item.label}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Footer */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-rose-400" />
            Encrypted Session
          </span>
          <span>US Operations</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="lg:col-span-7 bg-white flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              {mode === 'login'
                ? 'Sign in to access your financial workspace.'
                : 'Register with your username and an invitation key.'}
            </p>
          </div>

          {/* Animated Mode Tabs */}
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl mb-7 relative">
            {['login', 'register'].map((tab) => {
              const active = mode === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMode(tab)}
                  className={`relative z-10 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="auth-mode-pill"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10"
                    />
                  )}
                  {tab === 'login' ? 'Sign In' : 'Register'}
                </button>
              );
            })}
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
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#B9252B] focus:ring-4 focus:ring-rose-500/10 focus:bg-white transition-all"
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#B9252B] focus:ring-4 focus:ring-rose-500/10 focus:bg-white transition-all"
                  placeholder="••••••••"
                  minLength={mode === 'register' ? 6 : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-0.5">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Access Key
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={accessKey}
                        onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-mono tracking-wider placeholder:text-slate-300 focus:outline-none focus:border-[#B9252B] focus:ring-4 focus:ring-rose-500/10 focus:bg-white transition-all uppercase"
                        placeholder="PROTEX-XXXX-XXXX"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 bg-[#B9252B] hover:bg-[#9e1e23] active:scale-[0.99] text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 group disabled:opacity-50 shadow-lg shadow-rose-900/15"
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
