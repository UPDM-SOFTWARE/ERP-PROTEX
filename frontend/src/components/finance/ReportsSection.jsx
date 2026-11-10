import React, { useRef, useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Download, TrendingUp, TrendingDown, Activity, CreditCard,
  Calendar, ChevronLeft, ChevronRight, LayoutGrid, List,
  DollarSign, ArrowUpRight, ArrowDownRight, Wallet, BarChart2,
  PieChart as PieIcon, FileText
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const PALETTE = {
  income: '#10b981',
  expense: '#f43f5e',
  balance: '#6366f1',
  grid: 'rgba(0,0,0,0.06)',
  text: '#64748b', // slate-500
};

const CAT_COLORS = [
  '#6366f1','#f59e0b','#10b981','#f43f5e','#06b6d4','#a855f7','#ec4899','#14b8a6'
];

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-slate-500 text-xs mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="text-slate-900 font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon, trend }) {
  const colors = {
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', icon: 'bg-indigo-100 text-indigo-600' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', icon: 'bg-emerald-100 text-emerald-600' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-600', icon: 'bg-rose-100 text-rose-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', icon: 'bg-amber-100 text-amber-600' },
    zinc: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', icon: 'bg-slate-200 text-slate-600' },
  };
  const c = colors[color] || colors.zinc;
  return (
    <div className={`${c.bg} ${c.border} border rounded-2xl p-5 flex flex-col gap-3 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${trend >= 0 ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'}`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function ReportsSection({ title }) {
  const { movements, cards, getTotalBalance } = useFinance();

  const today = new Date();
  const [mode, setMode] = useState('monthly'); // 'monthly' | 'annual'
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedCard, setSelectedCard] = useState('all'); // 'all' | card.id
  const [chartView, setChartView] = useState('overview'); // 'overview' | 'categories' | 'evolution'
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef(null);

  // ── Filter movements by card ──
  const filteredMovements = useMemo(() =>
    selectedCard === 'all'
      ? movements
      : movements.filter(m => m.cardId === selectedCard),
    [movements, selectedCard]
  );

  // ── Monthly stats ──────────────────────────────────────────────────────────
  const monthlyStats = useMemo(() => {
    const filtered = filteredMovements.filter(m => {
      const d = new Date(m.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
    const income = filtered.filter(m => m.type?.toUpperCase() === 'INCOME').reduce((a, c) => a + Number(c.amount), 0);
    const expense = filtered.filter(m => m.type?.toUpperCase() === 'EXPENSE').reduce((a, c) => a + Number(c.amount), 0);
    const net = income - expense;
    return { filtered, income, expense, net };
  }, [filteredMovements, selectedMonth, selectedYear]);

  // ── Previous month for trend ────────────────────────────────────────────
  const prevMonthStats = useMemo(() => {
    const pm = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const py = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const filtered = filteredMovements.filter(m => {
      const d = new Date(m.date);
      return d.getMonth() === pm && d.getFullYear() === py;
    });
    const income = filtered.filter(m => m.type?.toUpperCase() === 'INCOME').reduce((a, c) => a + Number(c.amount), 0);
    const expense = filtered.filter(m => m.type?.toUpperCase() === 'EXPENSE').reduce((a, c) => a + Number(c.amount), 0);
    return { income, expense };
  }, [filteredMovements, selectedMonth, selectedYear]);

  const incomeTrend = prevMonthStats.income === 0 ? null
    : ((monthlyStats.income - prevMonthStats.income) / prevMonthStats.income) * 100;
  const expenseTrend = prevMonthStats.expense === 0 ? null
    : ((monthlyStats.expense - prevMonthStats.expense) / prevMonthStats.expense) * 100;

  // ── Balance timeline within month ──────────────────────────────────────────
  const balanceTimeline = useMemo(() => {
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const filtered = filteredMovements.filter(m => new Date(m.date) >= monthStart);
    const cashFlow = filtered.reduce((a, c) => 
      c.type?.toUpperCase() === 'INCOME' ? a + Number(c.amount) : a - Number(c.amount), 0);

    const currentBal = selectedCard === 'all'
      ? Number(getTotalBalance())
      : Number(cards.find(c => c.id === selectedCard)?.balance || 0);

    const approxInitial = currentBal - cashFlow;

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const sorted = [...monthlyStats.filtered].sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = approxInitial;
    const points = [];

    points.push({ day: `1 ${MONTH_NAMES[selectedMonth].slice(0,3)}`, balance: approxInitial, income: 0, expense: 0 });

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayMvs = sorted.filter(m => {
        if (!m.date) return false;
        const mDateStr = typeof m.date === 'string' ? m.date.split('T')[0] : new Date(m.date).toISOString().split('T')[0];
        return mDateStr === dayStr;
      });
      if (dayMvs.length === 0) continue;
      const dayIncome = dayMvs.filter(m => m.type?.toUpperCase() === 'INCOME').reduce((a, c) => a + Number(c.amount), 0);
      const dayExpense = dayMvs.filter(m => m.type?.toUpperCase() === 'EXPENSE').reduce((a, c) => a + Number(c.amount), 0);
      running += dayIncome - dayExpense;
      points.push({
        day: `${d} ${MONTH_NAMES[selectedMonth].slice(0, 3)}`,
        balance: running,
        income: dayIncome,
        expense: dayExpense,
      });
    }

    if (points[points.length - 1]?.day !== `${today.getDate()} ${MONTH_NAMES[selectedMonth].slice(0,3)}`) {
      points.push({
        day: `Today`,
        balance: currentBal,
        income: 0,
        expense: 0,
      });
    }

    return points;
  }, [monthlyStats, filteredMovements, selectedMonth, selectedYear, selectedCard, cards, getTotalBalance]);

  // ── Category breakdown ────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map = {};
    monthlyStats.filtered.filter(m => m.type?.toUpperCase() === 'EXPENSE').forEach(m => {
      const catName = m.category || 'General';
      map[catName] = (map[catName] || 0) + (Number(m.amount) || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyStats]);

  // ── Annual data ───────────────────────────────────────────────────────────
  const annualData = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => {
      const mvs = filteredMovements.filter(m => {
        const d = new Date(m.date);
        return d.getMonth() === idx && d.getFullYear() === selectedYear;
      });
      const income = mvs.filter(m => m.type?.toUpperCase() === 'INCOME').reduce((a, c) => a + Number(c.amount), 0);
      const expense = mvs.filter(m => m.type?.toUpperCase() === 'EXPENSE').reduce((a, c) => a + Number(c.amount), 0);
      return { name: name.slice(0, 3), income, expense, net: income - expense };
    });
  }, [filteredMovements, selectedYear]);

  // ── Annual totals ─────────────────────────────────────────────────────────
  const annualTotals = useMemo(() => {
    const income = annualData.reduce((a, c) => a + c.income, 0);
    const expense = annualData.reduce((a, c) => a + c.expense, 0);
    return { income, expense, net: income - expense };
  }, [annualData]);

  // ── Card navigation ───────────────────────────────────────────────────────
  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  // ── PDF export ────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: { margin: '0', padding: '24px' }
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise(r => { img.onload = r; });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (img.height * pdfW) / img.width;
      const pageH = pdf.internal.pageSize.getHeight();

      let yPos = 0;
      while (yPos < pdfH) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, -yPos, pdfW, pdfH);
        yPos += pageH;
      }

      const period = mode === 'monthly'
        ? `${MONTH_NAMES[selectedMonth]}_${selectedYear}`
        : `Annual_${selectedYear}`;
      pdf.save(`Report_${period}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 relative">
      {/* ── Top Controls Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
          {['monthly', 'annual'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === m
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m === 'monthly' ? 'Monthly' : 'Annual'}
            </button>
          ))}
        </div>

        {/* Period navigator */}
        <div className="flex items-center gap-2">
          {mode === 'monthly' ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-1 py-1">
              <button onClick={goToPrevMonth} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all">
                <ChevronLeft size={16} />
              </button>
              <span className="text-slate-700 font-semibold text-sm min-w-[140px] text-center capitalize">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
              <button onClick={goToNextMonth} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-1 py-1">
              <button onClick={() => setSelectedYear(y => y - 1)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all">
                <ChevronLeft size={16} />
              </button>
              <span className="text-slate-700 font-semibold text-sm min-w-[60px] text-center">{selectedYear}</span>
              <button onClick={() => setSelectedYear(y => y + 1)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Card filter */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 flex-wrap">
          <button
            onClick={() => setSelectedCard('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              selectedCard === 'all'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutGrid size={12} /> Global
          </button>
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => setSelectedCard(card.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                selectedCard === card.id
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CreditCard size={12} /> {card.bank}
            </button>
          ))}
        </div>

        {/* Export PDF */}
        <button
          onClick={generatePDF}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-md"
        >
          <Download size={15} />
          {isGenerating ? 'Generating...' : 'Export PDF'}
        </button>
      </div>

      {/* ── Chart view tabs ───────────────────────────────────────────────── */}
      {mode === 'monthly' && (
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0 w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'evolution', label: 'Evolution', icon: TrendingUp },
            { id: 'categories', label: 'Categories', icon: PieIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setChartView(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                chartView === id
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Report Body (PDF Capture) ─────────────────────────────────────── */}
      <div
        ref={reportRef}
        className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-5 pb-2"
        style={{ minHeight: 0 }}
      >
        {/* ── Report Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <BarChart2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {mode === 'monthly' ? 'Monthly' : 'Annual'} Report
              </h2>
              <p className="text-slate-500 text-xs capitalize">
                {mode === 'monthly'
                  ? `${MONTH_NAMES[selectedMonth]} ${selectedYear} · ${selectedCard === 'all' ? 'All cards' : `${cards.find(c => c.id === selectedCard)?.bank}`}`
                  : `Year ${selectedYear} · ${selectedCard === 'all' ? 'All cards' : `${cards.find(c => c.id === selectedCard)?.bank}`}`
                }
              </p>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-slate-400 text-xs">Generated on</p>
            <p className="text-slate-600 text-xs font-mono">{today.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        {/* ── MONTHLY MODE ─────────────────────────────────────────────────── */}
        {mode === 'monthly' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
              <KpiCard
                label="Est. Opening Balance"
                value={fmt(balanceTimeline[0]?.balance ?? 0)}
                icon={Wallet}
                color="zinc"
              />
              <KpiCard
                label="Monthly Income"
                value={fmt(monthlyStats.income)}
                icon={ArrowDownRight}
                color="emerald"
                trend={incomeTrend}
              />
              <KpiCard
                label="Monthly Expenses"
                value={fmt(monthlyStats.expense)}
                icon={ArrowUpRight}
                color="rose"
                trend={expenseTrend !== null ? -expenseTrend : null}
              />
              <KpiCard
                label="Net Balance"
                value={fmt(monthlyStats.net)}
                sub={monthlyStats.net >= 0 ? 'Positive month ✓' : 'Negative month ✗'}
                icon={DollarSign}
                color={monthlyStats.net >= 0 ? 'emerald' : 'rose'}
              />
            </div>

            {/* ── OVERVIEW: Balance timeline + bar ─────────────────────── */}
            {chartView === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Area balance */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-800 font-semibold text-sm">Balance Evolution</p>
                      <p className="text-slate-500 text-xs mt-0.5">Balance movement throughout the month</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />Balance
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220} minWidth={0}>
                    <AreaChart data={balanceTimeline} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} />
                      <XAxis dataKey="day" tick={{ fill: PALETTE.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: PALETTE.text, fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="balance" name="Balance" stroke="#6366f1" strokeWidth={2.5}
                        fill="url(#balGrad)" dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Income vs Expense bar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-slate-800 font-semibold text-sm mb-1">Income vs Expenses</p>
                  <p className="text-slate-500 text-xs mb-4">Period comparison</p>
                  <ResponsiveContainer width="100%" height={220} minWidth={0}>
                    <BarChart data={[{ name: MONTH_NAMES[selectedMonth].slice(0,3), income: monthlyStats.income, expense: monthlyStats.expense }]}
                      margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: PALETTE.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: PALETTE.text, fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={60} />
                      <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Quick summary */}
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Transactions</span>
                      <span className="text-slate-800 font-medium">{monthlyStats.filtered.length}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Savings Rate</span>
                      <span className={`font-medium ${monthlyStats.income > 0 && monthlyStats.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {monthlyStats.income > 0
                          ? `${((monthlyStats.net / monthlyStats.income) * 100).toFixed(1)}%`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Avg. spend/day</span>
                      <span className="text-slate-800 font-medium">
                        {fmt(monthlyStats.expense / new Date(selectedYear, selectedMonth + 1, 0).getDate())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── EVOLUTION: Day-by-day income + expense ───────────────── */}
            {chartView === 'evolution' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-slate-800 font-semibold text-sm mb-1">Daily Cash Flow</p>
                <p className="text-slate-500 text-xs mb-4">Income and expenses per day in {MONTH_NAMES[selectedMonth]}</p>
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <BarChart data={balanceTimeline} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: PALETTE.text, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: PALETTE.text, fontSize: 11 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(v) => <span style={{ color: '#64748b', fontSize: '12px' }}>{v}</span>} />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Balance line below */}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-slate-500 text-xs mb-3">Cumulative balance trend</p>
                  <ResponsiveContainer width="100%" height={120} minWidth={0}>
                    <LineChart data={balanceTimeline} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} />
                      <XAxis dataKey="day" tick={{ fill: PALETTE.text, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: PALETTE.text, fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="balance" name="Balance" stroke="#6366f1" strokeWidth={2.5}
                        dot={false} activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── CATEGORIES: Pie + ranked list ────────────────────────── */}
            {chartView === 'categories' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-slate-800 font-semibold text-sm mb-1">Expenses by Category</p>
                  <p className="text-slate-500 text-xs mb-2">{MONTH_NAMES[selectedMonth]} {selectedYear}</p>
                  {categoryData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No expenses recorded</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240} minWidth={0}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                          dataKey="value" nameKey="name" paddingAngle={3}>
                          {categoryData.map((_, i) => (
                            <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-slate-800 font-semibold text-sm mb-4">Expense Breakdown</p>
                  {categoryData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
                  ) : (
                    <div className="space-y-3">
                      {categoryData.map((cat, i) => {
                        const pct = monthlyStats.expense > 0 ? (cat.value / monthlyStats.expense) * 100 : 0;
                        return (
                          <div key={cat.name}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                                <span className="text-slate-700 text-sm">{cat.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-400 text-xs">{pct.toFixed(1)}%</span>
                                <span className="text-slate-800 font-semibold text-sm">{fmt(cat.value)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, background: CAT_COLORS[i % CAT_COLORS.length] }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Movements Table ───────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
                <FileText size={15} className="text-slate-500" />
                <p className="text-slate-800 font-semibold text-sm">
                  Transactions — {MONTH_NAMES[selectedMonth]} {selectedYear}
                </p>
                <span className="ml-auto text-slate-500 text-xs">{monthlyStats.filtered.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 bg-white">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Description</th>
                      <th className="px-5 py-3 font-medium">Category</th>
                      <th className="px-5 py-3 font-medium">Card</th>
                      <th className="px-5 py-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyStats.filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                          No transactions in this period.
                        </td>
                      </tr>
                    ) : (
                      monthlyStats.filtered.map(m => {
                        const card = cards.find(c => c.id === m.cardId);
                        return (
                          <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">{m.date ? String(m.date).split('T')[0] : '—'}</td>
                            <td className="px-5 py-3.5 text-slate-800 font-medium">{m.description}</td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-600 text-xs">{m.category}</span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 text-xs">{card?.bank || '—'}</td>
                            <td className={`px-5 py-3.5 text-right font-bold ${m.type?.toUpperCase() === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {m.type?.toUpperCase() === 'INCOME' ? '+' : '-'}{fmt(Number(m.amount))}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── ANNUAL MODE ──────────────────────────────────────────────────── */}
        {mode === 'annual' && (
          <>
            {/* Annual KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
              <KpiCard label="Total Income" value={fmt(annualTotals.income)} icon={ArrowDownRight} color="emerald" />
              <KpiCard label="Total Expenses" value={fmt(annualTotals.expense)} icon={ArrowUpRight} color="rose" />
              <KpiCard
                label="Annual Balance"
                value={fmt(annualTotals.net)}
                sub={annualTotals.net >= 0 ? 'Positive year ✓' : 'Negative year'}
                icon={DollarSign}
                color={annualTotals.net >= 0 ? 'emerald' : 'rose'}
              />
              <KpiCard
                label="Best Month"
                value={(() => {
                  const best = annualData.reduce((a, c) => c.net > a.net ? c : a, annualData[0]);
                  return best?.name || '—';
                })()}
                sub={fmt(Math.max(...annualData.map(d => d.net)))}
                icon={TrendingUp}
                color="indigo"
              />
            </div>

            {/* Annual bar chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-slate-800 font-semibold text-sm mb-1">Income vs Expenses by Month</p>
              <p className="text-slate-500 text-xs mb-4">Annual view {selectedYear}</p>
              <ResponsiveContainer width="100%" height={280} minWidth={0}>
                <BarChart data={annualData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: PALETTE.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: PALETTE.text, fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(v) => <span style={{ color: '#64748b', fontSize: '12px' }}>{v}</span>} />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[5, 5, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Annual net line */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-slate-800 font-semibold text-sm mb-1">Monthly Net Balance</p>
              <p className="text-slate-500 text-xs mb-4">Income minus expenses per month</p>
              <ResponsiveContainer width="100%" height={200} minWidth={0}>
                <AreaChart data={annualData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="netGradPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} />
                  <XAxis dataKey="name" tick={{ fill: PALETTE.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: PALETTE.text, fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="net" name="Net Balance" stroke="#10b981" strokeWidth={2.5}
                    fill="url(#netGradPos)" dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#10b981', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Annual summary table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
                <Calendar size={15} className="text-slate-500" />
                <p className="text-slate-800 font-semibold text-sm">Monthly Summary — {selectedYear}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 bg-white">
                      <th className="px-5 py-3 font-medium">Month</th>
                      <th className="px-5 py-3 font-medium text-right">Income</th>
                      <th className="px-5 py-3 font-medium text-right">Expenses</th>
                      <th className="px-5 py-3 font-medium text-right">Balance</th>
                      <th className="px-5 py-3 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {annualData.map((row, i) => (
                      <tr
                        key={row.name}
                        onClick={() => { setMode('monthly'); setSelectedMonth(i); }}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5 text-slate-800 font-medium">{MONTH_NAMES[i]}</td>
                        <td className="px-5 py-3.5 text-right text-emerald-600 font-semibold">{fmt(row.income)}</td>
                        <td className="px-5 py-3.5 text-right text-rose-600 font-semibold">{fmt(row.expense)}</td>
                        <td className={`px-5 py-3.5 text-right font-bold ${row.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {row.net >= 0 ? '+' : ''}{fmt(row.net)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {row.net >= 0
                              ? <TrendingUp size={14} className="text-emerald-600" />
                              : <TrendingDown size={14} className="text-rose-600" />}
                            <span className={`text-xs ${row.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {row.net >= 0 ? 'Positive' : 'Negative'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="px-5 py-3.5 text-slate-800 font-bold">ANNUAL TOTAL</td>
                      <td className="px-5 py-3.5 text-right text-emerald-600 font-bold">{fmt(annualTotals.income)}</td>
                      <td className="px-5 py-3.5 text-right text-rose-600 font-bold">{fmt(annualTotals.expense)}</td>
                      <td className={`px-5 py-3.5 text-right font-bold ${annualTotals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {annualTotals.net >= 0 ? '+' : ''}{fmt(annualTotals.net)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
