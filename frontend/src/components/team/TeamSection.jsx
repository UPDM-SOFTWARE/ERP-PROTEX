import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  Save, 
  CheckCircle2,
  Trash2,
  Lock,
  Plus,
  ArrowRight,
  LogOut,
  Copy,
  Crown,
  Edit2,
  X,
  AlertCircle,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { getT } from '../../i18n/translations';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export function TeamSection() {
  const { token, user, updateUser } = useAuth();
  const { language } = useSettings();
  const t = getT(language);
  const tt = t.team;

  const [isOwner, setIsOwner] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [owner, setOwner] = useState(null);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for No Team view
  const [joinToken, setJoinToken] = useState('');
  const [createCompanyName, setCreateCompanyName] = useState('');

  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // States for creating user
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  const [copiedToken, setCopiedToken] = useState(null);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const res = await fetch(`${API_URL}/team`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsOwner(data.isOwner);
        setCompanyName(data.companyName || '');
        setCompanyLogo(data.companyLogo || '');
        setTeamCode(data.teamCode || '');
        setOwner(data.owner || null);
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompany = async (nameToUpdate = companyName, logoToUpdate = companyLogo) => {
    try {
      const res = await fetch(`${API_URL}/team`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ companyName: nameToUpdate, companyLogo: logoToUpdate })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          updateUser(data.user);
        } else {
          updateUser({ companyName: data.companyName, companyLogo: data.companyLogo });
        }
        toast.success('Empresa guardada');
        setCompanyName(data.companyName);
        setCompanyLogo(data.companyLogo || '');
        setTeamCode(data.teamCode);
        setIsEditingCompany(false);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Error al actualizar la empresa');
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/team/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: joinToken })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('¡Te has unido al equipo!');
        setTimeout(() => {
          window.location.reload(); 
        }, 1500);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Error al unirse al equipo');
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    await handleUpdateCompany(createCompanyName, '');
  };

  const handleLeaveTeam = async () => {
    const msg = isOwner 
      ? '¿Estás seguro de que quieres salir? Si hay miembros, el administrador tomará tu lugar. Si no, el equipo se eliminará.' 
      : '¿Estás seguro de que quieres abandonar el equipo? Ya no podrás ver los datos.';
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`${API_URL}/team/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Has salido del equipo');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Error al salir');
    }
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/team/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newUserName, email: newUserEmail, password: newUserPassword })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Usuario creado exitosamente');
        setNewUserEmail(''); setNewUserName(''); setNewUserPassword('');
        setShowAddUserModal(false);
        fetchTeam();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Error al crear usuario');
    }
  };

  const handleDeleteMember = async (id) => {
    if (!confirm('¿Estás seguro de eliminar a este miembro del equipo?')) return;
    try {
      const res = await fetch(`${API_URL}/team/members/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMembers(members.filter(m => m.id !== id));
        toast.success('Miembro eliminado');
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  // handleUpdateRole removed as Admin role distinction is no longer used

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div></div>;
  }

  const hasTeam = !isOwner || (isOwner && companyName);

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-8 pb-8">
      {!hasTeam ? (
        // NO TEAM VIEW
        <div className="flex-1 flex flex-col md:flex-row gap-8 items-center justify-center p-4">
          
          {/* Join Team */}
          <div className="flex-1 max-w-sm w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6">
              <Users size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Unirse a un Equipo</h2>
            <p className="text-sm text-slate-500 mb-6">Ingresa el código del clan o empresa para unirte.</p>
            
            <form onSubmit={handleJoinTeam} className="w-full flex flex-col gap-4">
              <input 
                type="text" 
                required
                placeholder="Ej. ABX9L2"
                value={joinToken}
                onChange={e => setJoinToken(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 font-mono text-center tracking-widest text-lg"
              />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors shadow-sm">
                Unirse
              </button>
            </form>
          </div>

          <div className="text-slate-300 font-bold hidden md:block">O</div>

          {/* Create Team */}
          <div className="flex-1 max-w-sm w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-700 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
              <Building2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Crear mi Empresa</h2>
            <p className="text-sm text-slate-500 mb-6">Crea un espacio de trabajo propio para agregar a tus usuarios y gestionar datos.</p>
            
            <form onSubmit={handleCreateTeam} className="w-full flex flex-col gap-4">
              <input 
                type="text" 
                required
                placeholder="Nombre de la empresa"
                value={createCompanyName}
                onChange={e => setCreateCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 text-center"
              />
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-xl transition-colors shadow-sm">
                Crear Empresa
              </button>
            </form>
          </div>

        </div>
      ) : (
        // HAS TEAM VIEW
        <>
          {/* TOP CARD: TEAM / COMPANY */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5 shrink-0">
            
            {/* Logo */}
            <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-800 text-2xl font-bold shadow-sm shrink-0 overflow-hidden">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : companyName ? (
                companyName.substring(0, 2).toUpperCase()
              ) : (
                <Building2 size={32} className="text-slate-300" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 mb-1">
                <div>
                  
                  {isEditingCompany ? (
                    <div className="flex flex-col sm:flex-row items-start gap-2 mt-1 w-full max-w-lg">
                      <div className="flex flex-col gap-4 w-full">
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Nombre de la empresa"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-bold text-lg focus:outline-none focus:border-indigo-500 w-full"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={companyLogo}
                          onChange={(e) => setCompanyLogo(e.target.value)}
                          placeholder="URL del Logo (Opcional)"
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 text-sm focus:outline-none focus:border-indigo-500 w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateCompany()}
                          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          title="Guardar"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={() => setIsEditingCompany(false)}
                          className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                          title="Cancelar"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center sm:justify-start gap-2 group">
                      <h2 className="text-2xl font-bold text-slate-800">
                        {companyName || 'Mi Empresa'}
                      </h2>
                      {isOwner && (
                        <button
                          onClick={() => setIsEditingCompany(true)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Ajustes del equipo"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-2">
                    <button onClick={handleLeaveTeam} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 text-xs font-medium transition-colors shadow-sm" title={isOwner ? "Eliminar equipo o transferir propiedad" : "Salir del Equipo"}>
                      <LogOut size={14} /> {isOwner ? (members.length > 0 ? 'Salir' : 'Eliminar') : 'Salir'}
                    </button>
                    {isOwner && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-md border border-emerald-100 text-xs font-bold text-emerald-600">
                        <Lock size={12} /> Dueño
                      </div>
                    )}
                  </div>
                  {isOwner && teamCode && !isEditingCompany && (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                      <span className="text-xs text-slate-500 font-medium">Código:</span>
                      <code className="text-slate-800 font-mono text-sm font-bold tracking-widest">{teamCode}</code>
                      <button 
                        onClick={() => copyToClipboard(teamCode)}
                        className={`p-1.5 rounded-md transition-colors ${copiedToken === teamCode ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'}`}
                        title="Copiar código"
                      >
                        {copiedToken === teamCode ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
            {/* MEMBERS GRID */}
            <div className="flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex items-center justify-between mb-4 mt-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-800">Usuarios</h3>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {members.length}
                  </span>
                </div>
                {isOwner && (
                  <button 
                    onClick={() => setShowAddUserModal(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    <Plus size={16} /> Añadir Usuario
                  </button>
                )}
              </div>


                <motion.div 
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                  initial="hidden" animate="show"
                  variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
                >
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative group flex flex-col">
                    <div className="flex flex-col items-center text-center mb-4 mt-2">
                      <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 text-lg font-bold shadow-sm mb-3">
                        {owner?.name ? owner.name.substring(0, 2).toUpperCase() : <Users size={20} className="text-slate-300" />}
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm truncate w-full px-2 flex items-center justify-center gap-1">
                        {owner?.name || 'Propietario'}
                        <Crown size={14} className="text-amber-500 shrink-0" title="Propietario" />
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5 mt-0.5 w-full truncate px-2">
                        <span className="truncate">{owner?.email}</span>
                      </p>
                    </div>
                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-600">
                        Fundador
                      </span>
                    </div>
                  </div>

                  {members.map(m => (
                    <motion.div 
                      key={m.id}
                      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group flex flex-col"
                    >
                      {/* Actions */}
                      {isOwner && (
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Edit role removed */}
                          <button
                            onClick={() => handleDeleteMember(m.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Expulsar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-col items-center text-center mb-4 mt-2">
                        <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 text-lg font-bold shadow-sm mb-3">
                          {m.name ? m.name.substring(0, 2).toUpperCase() : <Users size={20} className="text-slate-300" />}
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm truncate w-full px-2 flex items-center justify-center gap-1">
                          {m.name || 'Sin nombre'}
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5 mt-0.5 w-full truncate px-2">
                          <span className="truncate">{m.email}</span>
                        </p>
                      </div>

                      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                        <>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                            Miembro
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </span>
                        </>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
            </div>


          </div>
        </>
      )}

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" /> Nuevo Usuario
              </h3>
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5">
              <form onSubmit={handleCreateMember} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 text-slate-800 font-medium"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Usuario</label>
                  <input
                    type="text"
                    placeholder="Ej. juan123"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Contraseña</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 text-slate-800 font-medium"
                  />
                </div>
                
                <div className="flex gap-3 mt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddUserModal(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm">
                    Crear Usuario
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
