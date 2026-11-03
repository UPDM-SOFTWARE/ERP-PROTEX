import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Shield, User, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export function UsersSection({ title }) {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar a este usuario permanentemente?')) return;
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Usuario eliminado');
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al eliminar usuario');
      }
    } catch (err) {
      toast.error('Error de red al eliminar usuario');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Error al crear usuario');
      
      setForm({ name: '', email: '', password: '', role: 'USER' });
      fetchUsers();
      toast.success('Usuario creado exitosamente');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 h-full">
      {/* Lista de Usuarios */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 overflow-y-auto custom-scrollbar shadow-sm">
        <h3 className="text-slate-800 font-bold mb-4 text-lg">Total de Usuarios ({users.length})</h3>
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                  {u.name ? u.name.substring(0, 2).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="text-slate-800 text-sm font-bold">{u.name}</p>
                  <p className="text-slate-500 text-xs">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                  {u.role === 'ADMIN' ? <Shield size={12} className="text-indigo-600" /> : <User size={12} className="text-emerald-600" />}
                  <span className="text-slate-600 text-xs font-medium">{u.role}</span>
                </div>
                {u.email !== 'admin' && (
                  <button 
                    onClick={() => handleDelete(u.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                    title="Eliminar usuario"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario de Creación */}
      <div className="w-full md:w-80 bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col shrink-0">
        <h3 className="text-slate-800 font-bold mb-4 text-lg flex items-center gap-2">
          <UserPlus size={18} className="text-indigo-600" /> Nuevo Usuario
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          <div>
            <label className="text-xs text-slate-500 font-medium ml-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium ml-1">Email / Usuario *</label>
            <input
              type="text"
              required
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
              placeholder="brayan"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium ml-1">Contraseña *</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
              placeholder="••••••••"
            />
          </div>
          {/* Rol Selection removed to prevent creating more Super Admins */}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>
      </div>
    </div>
  );
}
