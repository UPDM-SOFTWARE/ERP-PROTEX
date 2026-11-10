import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Image as ImageIcon, Globe, Save, Check, Shield, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { getT } from '../../i18n/translations';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export function SettingsSection() {
  const { user, token, updateUser } = useAuth();
  const { backgroundUrl, setBackgroundUrl, language, setLanguage } = useSettings();

  const t = getT(language);
  const ts = t.settings;

  const [activeTab, setActiveTab] = useState('profile');

  // Local state for profile form
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Local state for appearance form
  const [appData, setAppData] = useState({
    language: language || 'es',
  });

  // Local state for security form
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleAppChange = (e) => {
    setAppData({ ...appData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: profileData.name, email: profileData.email })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error al guardar el perfil');
        return;
      }
      if (data.token) localStorage.setItem('token', data.token);
      if (data.user) {
        updateUser(data.user);
      } else {
        updateUser({ name: profileData.name, email: profileData.email });
      }
      toast.success(t.settings.profile.title + ' guardado');
    } catch (err) {
      toast.error('Error de conexión al guardar el perfil');
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwords.newPassword || passwords.newPassword.length < 6) {
      toast.error(language === 'en' ? 'Password must be at least 6 characters.' : 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error(language === 'en' ? 'Passwords do not match.' : 'Las contraseñas no coinciden.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: passwords.newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error updating password');
        return;
      }
      setPasswords({ newPassword: '', confirmPassword: '' });
      toast.success(language === 'en' ? 'Password updated successfully' : 'Contraseña actualizada correctamente');
    } catch (err) {
      toast.error(language === 'en' ? 'Connection error' : 'Error de conexión');
    }
  };

  const handleSaveApp = () => {
    setLanguage(appData.language);
    toast.success(t.settings.appearance.title + ' guardado');
  };

  const tabs = [
    { id: 'profile',    icon: User,      label: ts.tabs.profile },
    { id: 'appearance', icon: Globe,     label: ts.tabs.appearance },
    { id: 'security',   icon: Shield,    label: ts.tabs.security },
  ];

  return (
    <div className="h-full flex gap-6">
      {/* Sidebar de Ajustes */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                isActive
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de Ajustes */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 overflow-y-auto custom-scrollbar relative shadow-sm">
        <div className="max-w-2xl">

          {/* ── PERFIL ── */}
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">{ts.profile.title}</h3>
                <p className="text-sm text-slate-500">{ts.profile.subtitle}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">{ts.profile.fullName}</label>
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">{ts.profile.email}</label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">{ts.profile.currentRole}</label>
                  <input
                    type="text"
                    value={user?.role === 'ADMIN' ? t.sidebar.admin : t.sidebar.user}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed shadow-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">{ts.profile.roleNote}</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-4">
                {/* Removed saved state visual since we use toast */ }
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-colors"
                >
                  <Save size={16} /> {ts.profile.save}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── APARIENCIA ── */}
          {activeTab === 'appearance' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">{ts.appearance.title}</h3>
                <p className="text-sm text-slate-500">{ts.appearance.subtitle}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-1.5">
                    <Globe size={16} /> {ts.appearance.language}
                  </label>
                  <div className="relative">
                    <select
                      name="language"
                      value={appData.language}
                      onChange={handleAppChange}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors cursor-pointer shadow-sm"
                    >
                      <option value="es">Español (Latinoamérica)</option>
                      <option value="en">English (US)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-4">
                <button
                  onClick={handleSaveApp}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-colors"
                >
                  <Save size={16} /> {ts.appearance.save}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SEGURIDAD (CAMBIAR CONTRASEÑA) ── */}
          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">
                  {language === 'en' ? 'Account Security' : 'Seguridad de la Cuenta'}
                </h3>
                <p className="text-sm text-slate-500">
                  {language === 'en' ? 'Update your account password.' : 'Actualiza la contraseña de acceso de tu cuenta.'}
                </p>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    {language === 'en' ? 'New Password' : 'Nueva Contraseña'}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    placeholder={language === 'en' ? 'Minimum 6 characters' : 'Mínimo 6 caracteres'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    {language === 'en' ? 'Confirm New Password' : 'Confirmar Nueva Contraseña'}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors shadow-sm"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-4">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-colors"
                  >
                    <Save size={16} /> {ts.profile.save}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
