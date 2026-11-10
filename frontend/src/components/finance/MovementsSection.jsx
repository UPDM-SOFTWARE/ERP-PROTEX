import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDownRight, ArrowUpRight, Plus, Filter, CalendarDays, Wallet,
  Send, ArrowLeftRight, Download, Receipt, TrendingUp, History,
  FileText, Briefcase, ChevronLeft, ChevronRight, X, CreditCard,
  UploadCloud, User, ChevronDown, ChevronUp, Loader2, CheckCircle, Scan, Trash2
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { getBankData } from '../../utils/bankData';
import { CreditCard as CardComponent } from '../common/CreditCard';

export function MovementsSection() {
  const { cards: allCards, movements, addMovement, receivables, payables, transferBetweenCards } = useFinance();
  
  // Filtrar tarjetas inactivas
  const cards = allCards.filter(c => c.isActive !== false);
  
  // State for Top Carousel
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Ensure index is within bounds if cards array shrinks
  const safeIndex = Math.min(currentIndex, Math.max(0, cards.length - 1));
  
  // State for Smart Column
  const [activeView, setActiveView] = useState('history'); // 'history', 'add_expense', 'add_income', 'receivables', 'payables'

  // Modals
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', data: null });
  const [transferModal, setTransferModal] = useState(false);
  const [transactionModal, setTransactionModal] = useState({ isOpen: false, type: 'income' });

  // Safety check if no cards
  const selectedCardId = cards.length > 0 ? cards[safeIndex]?.id : null;
  const selectedCard = cards.find(c => c.id === selectedCardId);

  const nextCard = () => {
    if (cards.length > 0) {
      setCurrentIndex((safeIndex + 1) % cards.length);
    }
  };

  const prevCard = () => {
    if (cards.length > 0) {
      setCurrentIndex(safeIndex === 0 ? cards.length - 1 : safeIndex - 1);
    }
  };

  // Helper for Bento Item
  const BentoItem = ({ id, icon: Icon, title, desc, colSpan = 1, color = "indigo" }) => {
    const isActive = activeView === id;
    const colorClasses = {
      indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
      emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
      red: "bg-red-50 text-red-700 border-red-200",
      amber: "bg-amber-50 text-amber-700 border-amber-200",
      blue: "bg-blue-50 text-blue-700 border-blue-200",
      purple: "bg-purple-50 text-purple-700 border-purple-200",
    };

    const iconColors = {
      indigo: "text-indigo-600 bg-indigo-100",
      emerald: "text-emerald-600 bg-emerald-100",
      red: "text-red-600 bg-red-100",
      amber: "text-amber-600 bg-amber-100",
      blue: "text-blue-600 bg-blue-100",
      purple: "text-purple-600 bg-purple-100",
    };

    const handleClick = () => {
      setActiveView(id);
    };

    return (
      <button
        onClick={handleClick}
        className={`
          relative flex flex-col items-start p-4 lg:p-5 rounded-[1.5rem] overflow-hidden transition-all duration-300 text-left group
          border bg-white shadow-sm min-h-[140px] shrink-0
          ${colSpan === 2 ? 'col-span-2' : 'col-span-1'}
          ${isActive 
            ? `${colorClasses[color]} scale-[0.98] ring-1 ring-${color}-200 shadow-md` 
            : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-1'
          }
        `}
      >
        <div className={`
          p-2.5 lg:p-3 rounded-2xl mb-3 lg:mb-4 transition-colors duration-300 shrink-0
          ${isActive ? 'bg-white/50' : 'bg-slate-100 group-hover:bg-slate-200'}
          ${isActive ? iconColors[color] : 'text-slate-500'}
        `}>
          <Icon size={22} className="lg:w-6 lg:h-6" />
        </div>
        <h3 className={`font-bold mb-1 text-sm lg:text-base leading-tight ${isActive ? 'text-slate-900' : 'text-slate-800'}`}>{title}</h3>
        <p className={`text-[11px] lg:text-xs leading-snug ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>{desc}</p>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden custom-scrollbar pb-6 lg:pb-0">
      
      {/* TOP SECTION: Carousel & Actions */}
      <div className="shrink-0 flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10 lg:px-8">
        
        {/* Background Ambient Glow - Removed for light theme or made very subtle */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[80px] bg-slate-200/50 blur-[80px] rounded-full pointer-events-none -z-10" />

        {/* Carousel Container */}
        <div className="relative w-full lg:w-[480px] h-36 flex items-center justify-center shrink-0">
          
          <button onClick={prevCard} className="absolute left-4 lg:left-0 z-20 p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-full transition-all border border-slate-200 shadow-sm hidden sm:flex">
            <ChevronLeft size={20} />
          </button>

          <div className="relative w-[260px] h-[140px] flex items-center justify-center perspective-[800px]">
            <AnimatePresence>
              {cards.map((card, idx) => {
                const bankData = getBankData(card.bank);
                
                // Determine position logic
                let position = 'hidden';
                let zIndex = -1;
                if (idx === currentIndex) {
                  position = 'center';
                  zIndex = 10;
                } else if (idx === (currentIndex - 1 + cards.length) % cards.length) {
                  position = 'left';
                  zIndex = 5;
                } else if (idx === (currentIndex + 1) % cards.length) {
                  position = 'right';
                  zIndex = 5;
                }

                // If only 1 card, don't apply left/right offsets
                if (cards.length === 1) position = 'center';

                const variants = {
                  center: { x: 0, scale: 1, opacity: 1, zIndex: 10, rotateY: 0 },
                  left: { x: -110, scale: 0.85, opacity: 0.5, zIndex: 5, rotateY: 15 },
                  right: { x: 110, scale: 0.85, opacity: 0.5, zIndex: 5, rotateY: -15 },
                  hidden: { x: 0, scale: 0.5, opacity: 0, zIndex: -1, rotateY: 0 }
                };

                return (
                  <motion.div
                    key={card.id}
                    variants={variants}
                    initial="hidden"
                    animate={position}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    onClick={() => {
                      if (position === 'left') prevCard();
                      if (position === 'right') nextCard();
                    }}
                    className="absolute w-full h-full cursor-pointer"
                  >
                    <CardComponent card={card} size="sm" className={`h-full w-full ${position === 'center' ? 'ring-2 ring-indigo-500/30 shadow-lg' : 'shadow-md'}`} />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {cards.length === 0 && (
              <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-3xl text-slate-500 bg-slate-50">
                <CreditCard size={24} className="mb-2 opacity-50" />
                <p className="text-xs text-center px-4">No cards available.</p>
              </div>
            )}
          </div>

          <button onClick={nextCard} className="absolute right-4 lg:right-0 z-20 p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-full transition-all border border-slate-200 shadow-sm hidden sm:flex">
            <ChevronRight size={20} />
          </button>

        </div>

        {/* Action Buttons to the Right */}
        <div className="flex flex-col justify-center flex-1 lg:pl-4 mt-6 lg:mt-0 mb-2 lg:mb-0">
          <div className="flex gap-6 justify-center">
            <button onClick={() => setTransactionModal({ isOpen: true, type: 'income' })} className="group flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-50 transition-all group-hover:scale-110 shadow-sm">
                <Download size={24} />
              </div>
              <span className="text-[10px] font-medium text-slate-500 group-hover:text-emerald-600 whitespace-nowrap transition-colors">Deposit</span>
            </button>
            <button onClick={() => setTransferModal(true)} className="group flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full bg-white border border-blue-200 text-blue-600 flex items-center justify-center group-hover:bg-blue-50 transition-all group-hover:scale-110 shadow-sm">
                <ArrowLeftRight size={24} />
              </div>
              <span className="text-[10px] font-medium text-slate-500 group-hover:text-blue-600 whitespace-nowrap transition-colors">Transfer</span>
            </button>
            <button onClick={() => setTransactionModal({ isOpen: true, type: 'expense' })} className="group flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full bg-white border border-indigo-200 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-50 transition-all group-hover:scale-110 shadow-sm">
                <Send size={24} />
              </div>
              <span className="text-[10px] font-medium text-slate-500 group-hover:text-indigo-600 whitespace-nowrap transition-colors">Withdraw</span>
            </button>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: Bento & Smart Column */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 mt-2">
        
        {/* Left: Bento Grid */}
        <div className="lg:w-5/12 grid grid-cols-2 gap-3 lg:gap-4 overflow-y-auto custom-scrollbar pr-2 pb-2">
          <BentoItem 
            id="history" 
            icon={History} 
            title="Transaction History" 
            desc="View all income and expenses" 
            colSpan={2} 
            color="indigo" 
          />
          <BentoItem 
            id="add_expense" 
            icon={TrendingUp} 
            title="Record Expense" 
            desc="Purchases, services..." 
            color="red" 
          />
          <BentoItem 
            id="add_income" 
            icon={Briefcase} 
            title="Record Sale" 
            desc="Income from services" 
            color="emerald" 
          />
          <BentoItem 
            id="receivables" 
            icon={FileText} 
            title="Accounts Receivable" 
            desc="Pending invoices" 
            color="amber" 
          />
          <BentoItem 
            id="payables" 
            icon={Receipt} 
            title="Accounts Payable" 
            desc="Upcoming payments" 
            color="purple" 
          />
        </div>

        {/* Right: Smart Column */}
        <div className="lg:w-7/12 relative bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          <div className="absolute inset-0 bg-slate-50/50 pointer-events-none" />
          
          <AnimatePresence mode="wait">
            {activeView === 'history' && <HistoryView key="history" selectedCardId={selectedCardId} movements={movements} />}
            {activeView === 'add_expense' && <QuickAddView key="add_expense" type="expense" selectedCardId={selectedCardId} addMovement={addMovement} setActiveView={setActiveView} />}
            {activeView === 'add_income' && <QuickAddView key="add_income" type="income" selectedCardId={selectedCardId} addMovement={addMovement} setActiveView={setActiveView} />}
            {activeView === 'receivables' && <ReceivablesView key="receivables" selectedCardId={selectedCardId} setConfirmModal={setConfirmModal} />}
            {activeView === 'payables' && <PayablesView key="payables" selectedCardId={selectedCardId} setConfirmModal={setConfirmModal} />}
          </AnimatePresence>
          
        </div>

      </div>

      {/* Modals */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <ConfirmModal 
            modal={confirmModal} 
            setModal={setConfirmModal} 
            selectedCardId={selectedCardId} 
          />
        )}
        {transferModal && (
          <TransferModal 
            setModal={setTransferModal} 
            sourceCardId={selectedCardId} 
          />
        )}
        {transactionModal.isOpen && (
          <TransactionModal 
            modal={transactionModal} 
            setModal={setTransactionModal} 
            selectedCardId={selectedCardId} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// --- Smart Column Views ---

function HistoryView({ selectedCardId, movements }) {
  const { deleteMovement } = useFinance();
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'INCOME', 'EXPENSE'
  const [showFilter, setShowFilter] = useState(false);

  const filteredMovements = useMemo(() => {
    if (!selectedCardId) return [];
    return movements.filter(m => {
      if (m.cardId !== selectedCardId) return false;
      if (filterType !== 'ALL' && m.type?.toUpperCase() !== filterType) return false;
      return true;
    });
  }, [movements, selectedCardId, filterType]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
      className="relative flex-1 flex flex-col h-full z-10"
    >
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h4 className="text-slate-800 font-medium flex items-center gap-2">
          <History size={18} className="text-indigo-600" /> Card History
        </h4>
        <div className="flex items-center gap-2">
          {showFilter && (
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'INCOME', label: 'Income' },
                { id: 'EXPENSE', label: 'Expenses' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filterType === f.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowFilter(prev => !prev)}
            className={`p-1.5 rounded-lg transition-colors ${showFilter ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}
            title="Filter movements"
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {filteredMovements.length > 0 ? (
          filteredMovements.map((movement, i) => {
            const isIncome = movement.type?.toUpperCase() === 'INCOME';
            return (
              <motion.div
                key={movement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative flex items-center justify-between p-4 rounded-2xl group border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center border ${
                    isIncome 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                      : 'bg-red-50 border-red-100 text-red-600'
                  }`}>
                    {isIncome ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-800 font-medium truncate">{movement.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><CalendarDays size={10} /> {movement.date ? String(movement.date).split('T')[0] : 'N/A'}</span>
                      <span>•</span>
                      <span>{movement.category || 'General'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <div className={`font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {isIncome ? '+' : '-'}${Number(movement.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <button
                    onClick={() => deleteMovement(movement.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete transaction (reverts card balance)"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Wallet size={48} className="opacity-50" />
            <p>No transactions on this card.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Tailwind Safelist for dynamic classes
const SAFELIST = "hidden bg-emerald-50 border-emerald-100 text-emerald-900 bg-emerald-100 text-emerald-600 focus:border-emerald-500 text-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-200 focus:ring-emerald-500 bg-red-50 border-red-100 text-red-900 bg-red-100 text-red-600 focus:border-red-500 text-red-400 bg-red-50/50 hover:bg-red-50 text-red-700 border-red-200 hover:bg-red-200 focus:ring-red-500";

function QuickAddView({ type, selectedCardId, addMovement, setActiveView }) {
  const { clients, addDocument, budgets } = useFinance();
  const isIncome = type === 'income';
  const color = isIncome ? 'emerald' : 'red';
  const Icon = isIncome ? ArrowDownRight : ArrowUpRight;

  const filteredContacts = clients.filter(c => c.type === (isIncome ? 'client' : 'provider'));

  const [form, setForm] = useState({
    amount: '', customIva: '', date: new Date().toISOString().split('T')[0],
    description: '', category: '', clientId: '',
    applyIva: false, attachedFile: null,
    folio: '', rfc: '', paymentMethod: '', notes: ''
  });

  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Clear error if amount changes
  React.useEffect(() => {
    if (error) setError(null);
  }, [form.amount]);

  const formatNumber = (val) => {
    if (!val && val !== 0 && val !== '0') return '';
    const parts = val.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
  };

  const handleNumericChange = (field, value) => {
    let raw = value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
    setForm({ ...form, [field]: raw });
  };

  const totalAmount = parseFloat(form.amount) || 0;
  const iva = form.applyIva ? totalAmount - (totalAmount / 1.16) : (parseFloat(form.customIva) || 0);
  const subtotal = totalAmount - iva;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsScanning(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        setIsScanning(false);
        setForm(prev => ({
          ...prev,
          attachedFile: file,
          attachedFileUrl: event.target.result
        }));
      };
      reader.onerror = () => {
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.amount || !form.description || !selectedCardId) return;

    if (form.attachedFile) {
      await addDocument({
        name: form.attachedFile.name,
        type: form.attachedFile.type || 'application/pdf',
        category: isIncome ? 'Created Invoices' : 'Scanned',
        date: form.date,
        size: form.attachedFile.size || 1024,
        url: form.attachedFileUrl || null
      });
    }

    const res = await addMovement({
      cardId: selectedCardId,
      type: type,
      amount: totalAmount,
      date: form.date,
      description: form.description,
      category: form.category || 'General',
      clientId: form.clientId || null,
    });
    
    if (res && res.success) {
      setActiveView('history');
    } else {
      setError(res?.error || 'Error al guardar el movimiento.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
      className="relative flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar z-10"
    >
      <div className={`px-6 py-5 border-b border-${color}-100 flex justify-between items-center bg-${color}-50 shrink-0`}>
        <h4 className={`text-${color}-900 font-medium flex items-center gap-2`}>
          <div className={`p-1.5 rounded-lg bg-${color}-100 text-${color}-600`}>
            <Icon size={16} />
          </div>
          Record {isIncome ? 'Sale (Income)' : 'Expense'}
        </h4>
        <button onClick={() => setActiveView('history')} className="text-slate-500 hover:text-slate-800 p-1 rounded-md hover:bg-slate-200 transition-colors">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 bg-white">
        <div className="grid grid-cols-3 gap-4 items-start">
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs text-slate-500 font-medium">Total Amount *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">$</span>
              <input
                type="text" required placeholder="0.00"
                value={formatNumber(form.amount)} onChange={e => handleNumericChange('amount', e.target.value)}
                className={`w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-4 text-slate-800 text-3xl font-bold focus:outline-none focus:border-${color}-500 transition-colors`}
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 col-span-1">
            <div className="flex items-center justify-between mt-1">
              <label className="text-xs text-slate-500 font-medium">IVA</label>
              <button 
                type="button"
                onClick={() => setForm({...form, applyIva: !form.applyIva, customIva: form.applyIva ? '' : iva.toFixed(2)})}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${form.applyIva ? `bg-${color}-100 text-${color}-700` : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
              >
                Auto 16%
              </button>
            </div>
            <div className="relative mt-0.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="text" placeholder="0.00"
                value={form.applyIva ? formatNumber(iva.toFixed(2)) : formatNumber(form.customIva)} 
                onChange={e => {
                  let raw = e.target.value.replace(/[^0-9.]/g, '');
                  setForm({...form, applyIva: false, customIva: raw});
                }}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-3 text-slate-800 text-base font-bold focus:outline-none focus:border-${color}-500 transition-colors`}
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {totalAmount > 0 && (
            <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="flex justify-between items-center text-xs text-slate-500 px-2 -mt-2">
              <span>Subtotal excl. tax: ${formatNumber(subtotal.toFixed(2))}</span>
              <span className={`${iva > 0 ? `text-${color}-600 font-medium` : ''}`}>Tax calculated: ${formatNumber(iva.toFixed(2))}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">Attachment (Optional)</label>
          <label className={`relative border-2 border-dashed border-${color}-200 bg-${color}-50/50 hover:bg-${color}-50 rounded-xl py-3 px-4 flex flex-row items-center justify-center gap-3 cursor-pointer transition-colors group overflow-hidden`}>
            {isScanning ? (
              <div className="flex items-center justify-center text-indigo-600 gap-2">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-sm font-bold">Attaching document...</span>
              </div>
            ) : form.attachedFile ? (
              <div className={`flex items-center justify-center text-${color}-600 gap-2 w-full`}>
                <CheckCircle size={20} />
                <span className="text-sm font-bold truncate max-w-[200px]">{form.attachedFile.name}</span>
              </div>
            ) : (
              <>
                <UploadCloud size={20} className={`text-${color}-400 group-hover:scale-110 transition-transform`} />
                <span className={`text-sm font-medium text-slate-600`}>Attach Receipt / Document (PDF or Image)</span>
              </>
            )}
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} disabled={isScanning} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">Date *</label>
            <input
              type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})}
              className={`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500 transition-colors`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">{isIncome ? 'Client' : 'Supplier'}</label>
            <select
              value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})}
              className={`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500 transition-colors appearance-none`}
            >
              <option value="">None</option>
              {filteredContacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">Category</label>
            <input
              list={`category-list-${type}`}
              placeholder="Type or select category..."
              value={form.category} onChange={e => setForm({...form, category: e.target.value})}
              className={`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500 transition-colors`}
            />
            <datalist id={`category-list-${type}`}>
              {isIncome ? (
                <>
                  <option value="Sales" />
                  <option value="Services" />
                  <option value="Others" />
                </>
              ) : (
                <>
                  {budgets.map(b => <option key={b.id} value={b.category} />)}
                  <option value="Services" />
                  <option value="Subscriptions" />
                  <option value="Payroll" />
                  <option value="Operations" />
                  <option value="Others" />
                </>
              )}
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">{isIncome ? 'Sale Description *' : 'Expense Description *'}</label>
            <input
              type="text" required placeholder="e.g. Client A Sale" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className={`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500 transition-colors`}
            />
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <div className="border-t border-slate-100 pt-2">
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-${color}-600 transition-colors mx-auto w-full`}
          >
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </button>
        </div>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-4 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500 font-medium">Folio / Invoice No.</label>
                  <input
                    type="text" placeholder="Optional" value={form.folio} onChange={e => setForm({...form, folio: e.target.value})}
                    className={`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500 transition-colors`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500 font-medium">Tax ID (Optional)</label>
                  <input
                    type="text" placeholder="XAXX010101000" value={form.rfc} onChange={e => setForm({...form, rfc: e.target.value})}
                    className={`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500 transition-colors uppercase`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 font-medium">Payment Method</label>
                <select
                  value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}
                  className={`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500 transition-colors appearance-none`}
                >
                  <option value="">Select...</option>
                  <option value="Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 font-medium">Additional Notes</label>
                <textarea
                  placeholder="Write a note..." rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className={`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500 transition-colors resize-none custom-scrollbar`}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          className={`
            mt-2 w-full font-bold py-4 rounded-xl transition-all duration-300
            border shadow-sm 
            ${error 
              ? 'bg-red-100 text-red-700 border-red-200' 
              : `text-${color}-700 bg-${color}-100 border-${color}-200 hover:bg-${color}-200 hover:shadow-md`
            }
          `}
        >
          {error ? error : `Confirm ${isIncome ? 'Sale' : 'Expense'}`}
        </button>
      </form>
    </motion.div>
  );
}

function ReceivablesView({ selectedCardId, setConfirmModal }) {
  const { receivables, addReceivable, deleteReceivable, collectReceivable, cards } = useFinance();
  const pendingList = receivables.filter(r => r.status === 'pending');
  const completedList = receivables.filter(r => r.status === 'paid');
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ description: '', amount: '', expectedDate: '' });

  const handleAdd = (e) => {
    e.preventDefault();
    if(!form.description || !form.amount) return;
    addReceivable({ ...form, amount: parseFloat(form.amount) });
    setShowAdd(false);
    setForm({ description: '', amount: '', expectedDate: '' });
  };

  const handleCollect = (r) => {
    if (!selectedCardId) {
      setError('Please select a card in the carousel first.');
      return;
    }
    setConfirmModal({ isOpen: true, type: 'receivable', data: r });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="relative flex-1 flex flex-col h-full z-10">
      <div className="px-6 py-5 border-b border-amber-100 flex justify-between items-center bg-amber-50">
        <h4 className="text-amber-900 font-medium flex items-center gap-2">
          <FileText size={18} className="text-amber-600" /> Accounts Receivable
        </h4>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-lg text-amber-700 font-medium transition-colors">
          {showAdd ? 'Cancel' : 'Add New'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-white">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm text-center mb-2">
            {error}
          </div>
        )}

        {showAdd && (
          <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3 mb-4">
            <input type="text" required placeholder="Description (e.g. Sales Bonus)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500" />
            <div className="flex gap-3">
              <input type="number" required placeholder="Amount ($)" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500" />
              <input type="date" value={form.expectedDate} onChange={e => setForm({...form, expectedDate: e.target.value})} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500" />
            </div>
            <button type="submit" className="w-full py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl text-sm font-bold transition-colors">Create Receivable</button>
          </form>
        )}

        {pendingList.length > 0 ? pendingList.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between group hover:border-slate-200 hover:shadow-md">
            <div>
              <p className="text-slate-800 font-medium">{r.description}</p>
              <p className="text-slate-500 text-xs mt-1 flex items-center gap-1"><CalendarDays size={10} /> Expected: {r.expectedDate || (r.dueDate ? String(r.dueDate).split('T')[0] : 'No date')}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="text-emerald-600 font-bold">+${Number(r.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleCollect(r)} className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-md transition-colors">
                  Collect
                </button>
                <button onClick={() => deleteReceivable(r.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )) : (!showAdd && (
          <div className="flex flex-col items-center justify-center text-slate-400 space-y-3 py-10">
            <FileText size={48} className="opacity-50" />
            <p>No pending accounts receivable.</p>
          </div>
        ))}

        {completedList.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-4 mb-2 px-2">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">History (Collected)</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            {completedList.map((r, i) => {
              const card = cards.find(c => c.id === r.cardId);
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 shadow-sm flex items-center justify-between opacity-80">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium line-through decoration-slate-300">{r.description}</p>
                      <p className="text-slate-500 text-xs mt-1">Collected on: {r.paidDate ? String(r.paidDate).split('T')[0] : 'N/A'} via {card?.bank || 'Card'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-slate-400 font-bold">${Number(r.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </div>
    </motion.div>
  );
}

function PayablesView({ selectedCardId, setConfirmModal }) {
  const { payables, addPayable, deletePayable, payPayable, cards } = useFinance();
  const pendingList = payables.filter(p => p.status === 'pending');
  const completedList = payables.filter(p => p.status === 'paid');
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ description: '', amount: '', expectedDate: '' });

  const handleAdd = (e) => {
    e.preventDefault();
    if(!form.description || !form.amount) return;
    addPayable({ ...form, amount: parseFloat(form.amount) });
    setShowAdd(false);
    setForm({ description: '', amount: '', expectedDate: '' });
  };

  const handlePay = (p) => {
    setError(null);
    if (!selectedCardId) {
      setError('Please select a card in the carousel first.');
      return;
    }
    setConfirmModal({ isOpen: true, type: 'payable', data: p });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="relative flex-1 flex flex-col h-full z-10">
      <div className="px-6 py-5 border-b border-purple-100 flex justify-between items-center bg-purple-50">
        <h4 className="text-purple-900 font-medium flex items-center gap-2">
          <Receipt size={18} className="text-purple-600" /> Accounts Payable
        </h4>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs px-3 py-1.5 bg-purple-100 hover:bg-purple-200 rounded-lg text-purple-700 font-medium transition-colors">
          {showAdd ? 'Cancel' : 'Add New'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-white">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm text-center mb-2">
            {error}
          </div>
        )}

        {showAdd && (
          <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3 mb-4">
            <input type="text" required placeholder="Description (e.g. Rent Payment)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-purple-500" />
            <div className="flex gap-3">
              <input type="number" required placeholder="Amount ($)" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-purple-500" />
              <input type="date" value={form.expectedDate} onChange={e => setForm({...form, expectedDate: e.target.value})} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-purple-500" />
            </div>
            <button type="submit" className="w-full py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl text-sm font-bold transition-colors">Create Payable</button>
          </form>
        )}

        {pendingList.length > 0 ? pendingList.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between group hover:border-slate-200 hover:shadow-md">
            <div>
              <p className="text-slate-800 font-medium">{p.description}</p>
              <p className="text-slate-500 text-xs mt-1 flex items-center gap-1"><CalendarDays size={10} /> Due: {p.expectedDate || (p.dueDate ? String(p.dueDate).split('T')[0] : 'No date')}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="text-rose-600 font-bold">-${Number(p.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handlePay(p)} className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-md transition-colors">
                  Pay
                </button>
                <button onClick={() => deletePayable(p.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )) : (!showAdd && (
          <div className="flex flex-col items-center justify-center text-slate-400 space-y-3 py-10">
            <Receipt size={48} className="opacity-50" />
            <p>No pending accounts payable.</p>
          </div>
        ))}

        {completedList.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-4 mb-2 px-2">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">History (Paid)</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            {completedList.map((p, i) => {
              const card = cards.find(c => c.id === p.cardId);
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 shadow-sm flex items-center justify-between opacity-80">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium line-through decoration-slate-300">{p.description}</p>
                      <p className="text-slate-500 text-xs mt-1">Paid on: {p.paidDate ? String(p.paidDate).split('T')[0] : 'N/A'} via {card?.bank || 'Card'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-slate-400 font-bold">${Number(p.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </div>
    </motion.div>
  );
}

// --- Modals ---

function ConfirmModal({ modal, setModal, selectedCardId }) {
  const { collectReceivable, payPayable } = useFinance();
  const isIncome = modal.type === 'receivable';
  const color = isIncome ? 'emerald' : 'red';
  const data = modal.data;
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const close = () => setModal({ isOpen: false, type: '', data: null });

  const handleConfirm = async () => {
    setError(null);
    setLoading(true);
    let res;
    try {
      if (isIncome) {
        res = await collectReceivable(data.id, selectedCardId);
      } else {
        res = await payPayable(data.id, selectedCardId);
      }
      if (res && res.success) {
        setSuccess(true);
      } else {
        setError(res?.error || 'An error occurred. Please try again.');
      }
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!loading ? close : undefined} />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white border border-slate-200 p-6 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col items-center text-center">
        
        {success ? (
          <>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
              className={`w-16 h-16 rounded-full bg-${color}-100 text-${color}-600 flex items-center justify-center mb-4`}
            >
              <CheckCircle size={36} />
            </motion.div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{isIncome ? 'Collection Successful!' : 'Payment Confirmed!'}</h3>
            <p className="text-slate-500 text-sm mb-6">
              <strong className={`text-${color}-600`}>${Number(data.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> has been {isIncome ? 'credited to' : 'debited from'} your account.
            </p>
            <button onClick={close} className={`w-full py-3 bg-${color}-100 hover:bg-${color}-200 text-${color}-700 font-bold rounded-xl transition-colors`}>
              Done
            </button>
          </>
        ) : (
          <>
            <div className={`w-16 h-16 rounded-full bg-${color}-100 text-${color}-600 flex items-center justify-center mb-4`}>
              {isIncome ? <Download size={32} /> : <Send size={32} />}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm {isIncome ? 'Collection' : 'Payment'}</h3>
            
            {error && (
              <div className="w-full bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm text-center mb-4">
                {error}
              </div>
            )}

            <p className="text-slate-600 text-sm mb-6">
              Are you sure you want to {isIncome ? 'collect' : 'pay'} <strong className={`text-${color}-600`}>${Number(data.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> for "{data.description}"?
              {!selectedCardId && <span className="block mt-2 text-amber-600 font-medium text-xs">⚠ No card selected in the carousel.</span>}
            </p>
            <div className="flex gap-3 w-full">
              <button onClick={close} disabled={loading} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors disabled:opacity-60">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={loading || !selectedCardId} className={`flex-1 py-3 bg-${color}-100 hover:bg-${color}-200 text-${color}-700 font-bold rounded-xl transition-colors disabled:opacity-60`}>
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function TransferModal({ setModal, sourceCardId }) {
  const { cards, transferBetweenCards } = useFinance();
  const [form, setForm] = useState({ targetId: '', amount: '', description: 'Account transfer' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const availableCards = cards.filter(c => c.id !== sourceCardId);
  const sourceCard = cards.find(c => c.id === sourceCardId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!form.targetId || !amt || amt <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    const res = await transferBetweenCards(sourceCardId, form.targetId, amt, form.description);
    if (res && res.success) {
      setSuccess(true);
    } else {
      setError(res?.error || 'Transfer failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModal(false)} />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white border border-slate-200 p-6 rounded-3xl shadow-2xl w-full max-w-sm">
        
        {success ? (
          <div className="flex flex-col items-center text-center py-4 gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <ArrowLeftRight size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Transfer Successful!</h3>
            <p className="text-slate-500 text-sm">The funds have been moved between your accounts.</p>
            <button onClick={() => setModal(false)} className="w-full mt-2 font-bold py-3 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl transition-colors">Close</button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="text-blue-600" /> Transfer
              </h3>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {availableCards.length === 0 ? (
              <div className="text-center text-slate-500 py-4">No other cards available for transfer.</div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && <div className="text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg text-sm text-center">{error}</div>}
                
                <div className="text-sm text-slate-500 text-center mb-2">
                  From: <strong className="text-slate-800">Active card (${Number(sourceCard?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})</strong>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-600 font-medium">To Card</label>
                  <select required value={form.targetId} onChange={e => setForm({...form, targetId: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-blue-500 appearance-none">
                    <option value="">Select card...</option>
                    {availableCards.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.bank} (${Number(c.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-600 font-medium">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input type="number" required step="0.01" min="0.01" max={Number(sourceCard?.balance || 0)} placeholder="0.00"
                      value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-slate-800 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-600 font-medium">Description</label>
                  <input type="text" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-blue-500" />
                </div>

                <button type="submit" className="w-full mt-2 font-bold py-3 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl transition-colors">
                  Transfer Funds
                </button>
              </form>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

function TransactionModal({ modal, setModal, selectedCardId }) {
  const { addMovement, budgets } = useFinance();
  const isIncome = modal.type === 'income';
  const color = isIncome ? 'emerald' : 'indigo';
  const Icon = isIncome ? Download : Send;

  const [form, setForm] = useState({
    amount: '', date: new Date().toISOString().split('T')[0],
    description: '', category: '', beneficiary: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0 || !form.description) return;
    if (!selectedCardId) {
      setError('No card selected in the carousel.');
      return;
    }

    setLoading(true);
    const res = await addMovement({
      cardId: selectedCardId,
      type: modal.type,
      amount: amt,
      date: form.date,
      description: form.description,
      category: form.category || 'General',
    });
    setLoading(false);
    
    if (res && res.success) {
      setSuccess(true);
    } else {
      setError(res?.error || 'An error occurred. Please try again.');
    }
  };

  const close = () => setModal({ isOpen: false, type: 'income' });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={close} />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white border border-slate-200 p-6 rounded-3xl shadow-2xl w-full max-w-sm">
        
        {success ? (
          <div className="flex flex-col items-center text-center py-4 gap-4">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
              className={`w-16 h-16 rounded-full bg-${color}-100 text-${color}-600 flex items-center justify-center`}
            >
              <CheckCircle size={36} />
            </motion.div>
            <h3 className="text-xl font-bold text-slate-900">{isIncome ? 'Deposit Successful!' : 'Withdrawal Recorded!'}</h3>
            <p className="text-slate-500 text-sm">
              <strong className={`text-${color}-600`}>${parseFloat(form.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> has been {isIncome ? 'added to' : 'deducted from'} your account.
            </p>
            <button onClick={close} className={`w-full mt-2 font-bold py-3 bg-${color}-100 text-${color}-700 hover:bg-${color}-200 rounded-xl transition-colors`}>Done</button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-bold text-slate-900 flex items-center gap-2`}>
                <Icon className={`text-${color}-600`} /> {isIncome ? 'Deposit Money' : 'Withdraw Money'}
              </h3>
              <button onClick={close} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && <div className="text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg text-sm text-center">{error}</div>}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-600 font-medium">Amount to {isIncome ? 'Deposit' : 'Withdraw'}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input type="number" required step="0.01" min="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={`w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500`} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-600 font-medium">Description / Source</label>
                <input type="text" required placeholder={isIncome ? 'e.g. Cash Deposit' : 'e.g. ATM Withdrawal'} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500`} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-600 font-medium">Category</label>
                <input
                  list={`modal-category-list-${modal.type}`}
                  type="text" placeholder="e.g. Sales, Rent, Marketing..." value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500`}
                />
                <datalist id={`modal-category-list-${modal.type}`}>
                  {isIncome ? (
                    <>
                      <option value="Sales" />
                      <option value="Services" />
                      <option value="Others" />
                    </>
                  ) : (
                    <>
                      {budgets?.map(b => <option key={b.id} value={b.category} />)}
                      <option value="Services" />
                      <option value="Subscriptions" />
                      <option value="Payroll" />
                      <option value="Operations" />
                      <option value="Others" />
                    </>
                  )}
                </datalist>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-600 font-medium">Date</label>
                <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-${color}-500`} />
              </div>

              <button type="submit" disabled={loading} className={`w-full mt-2 font-bold py-3 bg-${color}-100 text-${color}-700 hover:bg-${color}-200 rounded-xl transition-colors disabled:opacity-60`}>
                {loading ? 'Processing...' : `Confirm ${isIncome ? 'Deposit' : 'Withdrawal'}`}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
