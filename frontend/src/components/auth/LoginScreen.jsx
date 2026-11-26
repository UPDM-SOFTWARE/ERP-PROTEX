import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, KeyRound, Lock, User, ShieldCheck, Eye, EyeOff } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-white grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
      {/* Left Brand Panel — Pure White Architectural Canvas (logo blends natively) */}
      <div className="lg:col-span-6 relative bg-white border-b lg:border-b-0 lg:border-r border-slate-200/80 p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Subtle architectural grid faded at edges */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(226,232,240,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(226,232,240,0.45) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, #000 35%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, #000 35%, transparent 100%)',
          }}
        />

        {/* Top minimal bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B9252B]" />
            <span className="text-xs font-bold tracking-[0.22em] uppercase text-slate-800">
              ERP US
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-400 tracking-wider uppercase">
            Finance & Operations
          </span>
        </div>

        {/* Center Hero Logo + Editorial Typography */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-10 my-10 lg:my-0 flex flex-col items-center text-center"
        >
          <div className="w-52 h-52 sm:w-64 sm:h-64 lg:w-72 lg:h-72 flex items-center justify-center bg-white rounded-full p-3">
            <img
              src={ErpUsLogo}
              alt="ERP US Logo"
              className="w-full h-full object-contain select-none"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-4">
            Precision financial management.
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-sm leading-relaxed">
            Real-time accounts, invoicing, receivables, and team controls in one clean workspace.
          </p>
        </motion.div>

        {/* Bottom minimal status */}
        <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#B9252B]" />
            256-bit Encrypted Session
          </span>
          <span className="font-mono text-[11px] text-slate-400">US · PROD</span>
        </div>
      </div>

      {/* Right Form Panel — Soft Slate Surface */}
      <div className="lg:col-span-6 bg-slate-50/70 flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              {mode === 'login'
                ? 'Enter your credentials to continue.'
                : 'Use your username and invitation key to register.'}
            </p>
          </div>

          {/* Animated Mode Tabs */}
          <div className="grid grid-cols-2 bg-slate-200/70 p-1 rounded-xl mb-7 relative">
            {['login', 'register'].map((tab) => {
              const active = mode === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMode(tab)}
                  className={`relative z-10 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="auth-mode-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
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
                  className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#B9252B] focus:ring-4 focus:ring-rose-500/10 transition-all shadow-xs"
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
                  className="w-full pl-10 pr-11 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#B9252B] focus:ring-4 focus:ring-rose-500/10 transition-all shadow-xs"
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
                        className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-mono tracking-wider placeholder:text-slate-300 focus:outline-none focus:border-[#B9252B] focus:ring-4 focus:ring-rose-500/10 transition-all uppercase shadow-xs"
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
              className="w-full mt-4 py-3.5 bg-slate-900 hover:bg-[#B9252B] active:scale-[0.99] text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 group disabled:opacity-50 shadow-sm"
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
