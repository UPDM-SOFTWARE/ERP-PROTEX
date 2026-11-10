import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Briefcase, Plus, Search, Mail, Phone, MapPin, Trash2, Edit2, X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export function ClientsSection() {
  const { clients, addClient, updateClient, deleteClient } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'client', 'provider'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('client')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === 'client' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Clients
          </button>
          <button
            onClick={() => setFilterType('provider')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === 'provider' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Providers
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => { setEditingClient(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shrink-0 shadow-sm"
          >
            <Plus size={18} /> <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      {/* Grid of Clients */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredClients.map(client => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${client.type === 'client' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {client.type === 'client' ? <Users size={20} /> : <Briefcase size={20} />}
                      </div>
                      <div>
                        <h3 className="text-slate-800 font-bold text-base truncate pr-2" title={client.name}>{client.name}</h3>
                        <span className={`text-[10px] uppercase tracking-wider font-bold ${client.type === 'client' ? 'text-indigo-500' : 'text-emerald-500'}`}>
                          {client.type === 'client' ? 'Client' : 'Provider'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all absolute top-4 right-4">
                      <button
                        onClick={() => { setEditingClient(client); setIsModalOpen(true); }}
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => deleteClient(client.id)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{client.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{client.phone || '—'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{client.address || '—'}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Users size={64} className="opacity-20" />
            <p className="text-lg">No contacts found.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <AddClientModal
            isOpen={isModalOpen}
            editingClient={editingClient}
            onClose={() => { setIsModalOpen(false); setEditingClient(null); }}
            onAdd={addClient}
            onUpdate={updateClient}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AddClientModal({ onClose, onAdd, onUpdate, editingClient }) {
  const [form, setForm] = useState({
    name: editingClient?.name || '',
    email: editingClient?.email || '',
    phone: editingClient?.phone || '',
    address: editingClient?.address || '',
    type: editingClient?.type || 'client'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    if (editingClient && onUpdate) {
      onUpdate(editingClient.id, form);
    } else {
      onAdd(form);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white border border-slate-200 p-6 rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">{editingClient ? 'Edit Contact' : 'New Contact'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
          {/* Tabs for Type */}
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl relative">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'client' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all z-10 ${form.type === 'client' ? 'text-indigo-700 shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users size={16} /> Client
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'provider' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all z-10 ${form.type === 'provider' ? 'text-emerald-700 shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Briefcase size={16} /> Provider
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Name / Company *</label>
            <input required type="text" placeholder="e.g. Acme Corp" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Email</label>
              <input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Phone</label>
              <input type="tel" placeholder="+1 234 567 8900" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Physical Address</label>
            <input type="text" placeholder="Street, City, Country..." value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
          </div>

          <div className="pt-2">
            <button type="submit" className={`w-full py-3.5 text-white rounded-xl font-bold shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 ${form.type === 'client' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              Save {form.type === 'client' ? 'Client' : 'Provider'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
