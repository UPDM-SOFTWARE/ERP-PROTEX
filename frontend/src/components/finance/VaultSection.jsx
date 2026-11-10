import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderLock, UploadCloud, Search, FileText, Image as ImageIcon, 
  Trash2, Eye, Download, X, File, AlertCircle, CheckCircle2,
  Edit2, Save, FileEdit
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export function VaultSection({ title, onNavigate }) {
  const { documents, addDocument, deleteDocument, updateDocument, startEditingInvoice } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All'); // 'All', 'Created Invoices', 'Scanned', 'Other'
  
  const [previewDoc, setPreviewDoc] = useState(null);
  
  // Upload States
  const [isDragging, setIsDragging] = useState(false);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Edit Name State
  const [editingId, setEditingId] = useState(null);
  const [editNameValue, setEditNameValue] = useState('');

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const getCategoryFromType = (type, name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('factura') || lowerName.includes('invoice')) return 'Created Invoices';
    if (lowerName.includes('ticket') || lowerName.includes('recibo') || lowerName.includes('scan')) return 'Scanned';
    return 'Other';
  };

  const resolveFileUrl = (url) => {
    if (!url) return '';
    if (url.includes('/uploads/')) {
      return '/uploads/' + url.split('/uploads/')[1];
    }
    return url;
  };

  const isInvoiceDocument = (doc) => {
    if (!doc) return false;
    if (doc.invoiceData) return true;
    const cat = (doc.category || '').toLowerCase();
    const name = (doc.name || '').toLowerCase();
    return cat === 'invoice' || cat === 'factura' || cat === 'created invoices' || name.startsWith('invoice_') || name.includes('invoice');
  };

  const handleEditInvoice = (doc) => {
    if (!doc) return;
    startEditingInvoice(doc);
    if (onNavigate) {
      onNavigate('billing');
    }
  };

  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const newUploads = [];
    let processed = 0;

    fileArray.forEach((file) => {
      // Validar tipo o extensión
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

      if (!isImage && !isPdf) {
        alert(`The file ${file.name} is not a valid image or PDF.`);
        processed++;
        if (processed === fileArray.length && newUploads.length > 0) {
          setPendingUploads(prev => [...prev, ...newUploads]);
        }
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        newUploads.push({
          id: Date.now().toString() + Math.random().toString(), // Temp ID
          name: file.name,
          type: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
          size: file.size,
          category: getCategoryFromType(file.type || '', file.name),
          date: new Date().toISOString().split('T')[0],
          url: event.target.result // Base64 url
        });
        processed++;
        if (processed === fileArray.length) {
          setPendingUploads(prev => [...prev, ...newUploads]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input AFTER reading starts
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload({ target: { files: e.dataTransfer.files, value: '' } });
    }
  };

  const updatePendingName = (id, newName) => {
    setPendingUploads(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const confirmUpload = async () => {
    setIsUploading(true);
    try {
      await Promise.all(
        pendingUploads.map(doc => {
          const { id, ...docData } = doc;
          return addDocument(docData);
        })
      );
      setPendingUploads([]);
    } catch (err) {
      console.error('Error uploading documents:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const startEditing = (doc) => {
    setEditingId(doc.id);
    setEditNameValue(doc.name);
  };

  const saveEdit = (id) => {
    if (editNameValue.trim()) {
      updateDocument(id, { name: editNameValue.trim() });
    }
    setEditingId(null);
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // If the category of an old invoice is 'Factura', treat it as 'Created Invoices' for the filter
    let effectiveCategory = doc.category;
    if (effectiveCategory === 'Factura' || effectiveCategory === 'Facturas Creadas') effectiveCategory = 'Created Invoices';
    if (effectiveCategory === 'Ticket' || effectiveCategory === 'Escaneados') effectiveCategory = 'Scanned';

    const matchesFilter = filter === 'All' || effectiveCategory === filter;
    return matchesSearch && matchesFilter;
  });

  const getFileIcon = (type, size = 20) => {
    if (!type) return <File size={size} className="text-indigo-500" />;
    if (type.startsWith('image/')) return <ImageIcon size={size} className="text-emerald-500" />;
    if (type === 'application/pdf') return <FileText size={size} className="text-red-500" />;
    return <File size={size} className="text-indigo-500" />;
  };

  return (
    <div className="h-full flex flex-col gap-6 relative">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
          Store and manage invoices, tickets, and important documents securely.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {/* Categorías */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
            {[
              { id: 'All', label: 'All' },
              { id: 'Created Invoices', label: 'Created Invoices' },
              { id: 'Scanned', label: 'Tickets/Scanned' },
              { id: 'Other', label: 'Other' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === cat.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors w-48 focus:w-64 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* GRID CONTAINER */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          
          {/* 1. UPLOAD BOX (Same size as a card) */}
          <div 
            className={`min-h-[160px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 text-center transition-all cursor-pointer ${
              isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.click();
            }}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
              isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-slate-400 shadow-sm border border-slate-200'
            }`}>
              <UploadCloud size={24} />
            </div>
            <h3 className="text-slate-800 text-sm font-medium mb-1">Upload Document</h3>
            <p className="text-slate-500 text-xs px-2">Click or drag a file here (PDF/JPG)</p>
            
            <input 
              type="file" 
              multiple 
              accept="image/*,application/pdf"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* 2. DOCUMENTS LIST */}
          <AnimatePresence>
            {filteredDocs.map((doc) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group flex flex-col gap-3 min-h-[160px] relative overflow-hidden"
              >
                {/* Top row: Icon & Actions */}
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {getFileIcon(doc.type)}
                  </div>
                  
                  {/* Floating Action Bar on hover */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-md rounded-lg p-1 border border-slate-200 shadow-sm absolute top-3 right-3">
                    <button 
                      onClick={() => setPreviewDoc(doc)}
                      className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="View"
                    >
                      <Eye size={14} />
                    </button>
                    {(doc.fileUrl || doc.url) && (
                      <a 
                        href={resolveFileUrl(doc.fileUrl || doc.url)} 
                        download={doc.name}
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-center"
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                    )}
                    {isInvoiceDocument(doc) && (
                      <button 
                        onClick={() => handleEditInvoice(doc)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit Invoice Details"
                      >
                        <FileEdit size={14} />
                      </button>
                    )}
                    <button 
                      onClick={() => startEditing(doc)}
                      className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Rename"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => deleteDocument(doc.id)}
                      className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Title & Info */}
                <div className="flex-1 flex flex-col justify-center">
                  {editingId === doc.id ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input 
                        type="text" 
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="w-full bg-slate-50 border border-indigo-200 rounded px-2 py-1 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(doc.id)}
                      />
                      <button onClick={() => saveEdit(doc.id)} className="text-emerald-600 hover:text-emerald-700">
                        <Save size={16} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-800 text-sm font-medium line-clamp-2 mb-1" title={doc.name}>
                      {doc.name}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{doc.date || (doc.createdAt ? String(doc.createdAt).split('T')[0] : '—')}</span>
                    <span>•</span>
                    <span>{formatBytes(doc.size)}</span>
                  </div>
                </div>

                {/* Bottom Tags */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-600 font-medium">
                    {doc.category === 'Factura' || doc.category === 'Facturas Creadas' ? 'Created Invoices' : doc.category}
                  </span>
                  {doc.type === 'application/pdf' && <span className="text-[10px] text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded font-bold tracking-wide">PDF</span>}
                  {doc.type?.startsWith('image/') && <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-bold tracking-wide">IMG</span>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* CONFIRM UPLOAD MODAL */}
      <AnimatePresence>
        {pendingUploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-slate-900 font-bold text-lg flex items-center gap-2">
                  <UploadCloud className="text-indigo-600" size={20} />
                  Confirm Upload
                </h3>
                {!isUploading && (
                  <button onClick={() => setPendingUploads([])} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-4 bg-slate-50/50">
                {pendingUploads.map((doc, idx) => (
                  <div key={doc.id} className="flex gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      {getFileIcon(doc.type, 18)}
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">File name</label>
                      <input 
                        type="text"
                        value={doc.name}
                        disabled={isUploading}
                        onChange={(e) => updatePendingName(doc.id, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-white">
                <button 
                  onClick={() => setPendingUploads([])}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmUpload}
                  disabled={isUploading}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-all flex items-center gap-2 shadow-md"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>Confirm and Upload</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREVIEW MODAL */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10"
          >
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPreviewDoc(null)} />
            
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  {getFileIcon(previewDoc.type, 24)}
                  <div>
                    <h3 className="text-slate-900 font-bold truncate max-w-[300px] sm:max-w-md">{previewDoc.name}</h3>
                    <p className="text-slate-500 text-xs font-medium">{previewDoc.category === 'Factura' || previewDoc.category === 'Facturas Creadas' ? 'Created Invoices' : previewDoc.category} • {formatBytes(previewDoc.size)} • {previewDoc.date || (previewDoc.createdAt ? String(previewDoc.createdAt).split('T')[0] : '—')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isInvoiceDocument(previewDoc) && (
                    <button 
                      onClick={() => {
                        const target = previewDoc;
                        setPreviewDoc(null);
                        handleEditInvoice(target);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200 text-xs font-semibold shadow-sm"
                      title="Edit Invoice Details"
                    >
                      <FileEdit size={15} />
                      <span>Edit Invoice</span>
                    </button>
                  )}
                  {(previewDoc.fileUrl || previewDoc.url) && (
                    <a 
                      href={resolveFileUrl(previewDoc.fileUrl || previewDoc.url)} 
                      download={previewDoc.name}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100"
                      title="Download"
                    >
                      <Download size={20} />
                    </a>
                  )}
                  <button 
                    onClick={() => setPreviewDoc(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-100 overflow-hidden flex items-center justify-center p-4">
                {(previewDoc.fileUrl || previewDoc.url) ? (
                  previewDoc.type === 'application/pdf' ? (
                    <iframe 
                      src={resolveFileUrl(previewDoc.fileUrl || previewDoc.url)} 
                      className="w-full h-full rounded-xl bg-white shadow-sm border border-slate-200"
                      title={previewDoc.name}
                    />
                  ) : previewDoc.type?.startsWith('image/') ? (
                    <img 
                      src={resolveFileUrl(previewDoc.fileUrl || previewDoc.url)} 
                      alt={previewDoc.name}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-sm border border-slate-200 bg-white"
                    />
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center gap-4">
                      <AlertCircle size={48} className="text-amber-500" />
                      <p className="font-medium">Preview not available for this format.</p>
                      <a 
                        href={resolveFileUrl(previewDoc.fileUrl || previewDoc.url)} 
                        download={previewDoc.name}
                        className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors shadow-sm"
                      >
                        Download file
                      </a>
                    </div>
                  )
                ) : (
                  <div className="text-slate-400 flex flex-col items-center gap-2">
                    <AlertCircle size={32} />
                    <p>File temporarily unavailable (mock mode).</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
