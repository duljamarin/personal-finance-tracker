import { useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

const DEMO_STORAGE_KEY = 'demo_pending_import';

function saveDemoAndNavigate(transactions, navigate, path) {
  const payload = transactions.map(({ id: _id, ...tx }) => tx);
  const json = JSON.stringify(payload);
  try {
    sessionStorage.setItem(DEMO_STORAGE_KEY, json);
  } catch {
    // sessionStorage full or blocked
  }
  try {
    // localStorage survives cross-tab navigation (e.g. email confirmation link opens in new tab)
    localStorage.setItem(DEMO_STORAGE_KEY, json);
  } catch {
    // localStorage blocked
  }
  navigate(path);
}
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

// ── Colour palette ──────────────────────────────────────────────────────────
const CAT_COLORS = {
  'Food & Dining':    '#1c8071',
  'Housing & Rent':   '#168b78',
  'Transportation':   '#E8A838',
  'Entertainment':    '#9B6DC8',
  'Shopping':         '#E85C3A',
  'Healthcare':       '#3ABFE8',
  'Coffee & Snacks':  '#D47B3F',
  'Utilities':        '#4B8B6F',
  'Salary':           '#168b78',
  'Freelance':        '#4CAF82',
};
const COLOR_LIST = Object.values(CAT_COLORS);
const getColor = (cat, idx) => CAT_COLORS[cat] ?? COLOR_LIST[idx % COLOR_LIST.length];

// ── Seed transactions ────────────────────────────────────────────────────────
const fmt = (d) => d.toISOString().slice(0, 10);

function makeSeedTransactions() {
  const today = new Date();
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return fmt(d); };
  return [
    { id: 1,  title: 'Monthly Salary',     amount: 3200,  type: 'income',  category: 'Salary',          date: daysAgo(2) },
    { id: 2,  title: 'Grocery Shopping',   amount: 87.5,  type: 'expense', category: 'Food & Dining',   date: daysAgo(3) },
    { id: 3,  title: 'Netflix',            amount: 13.99, type: 'expense', category: 'Entertainment',   date: daysAgo(4) },
    { id: 4,  title: 'Electricity Bill',   amount: 62,    type: 'expense', category: 'Utilities',       date: daysAgo(5) },
    { id: 5,  title: 'Morning Coffee',     amount: 4.5,   type: 'expense', category: 'Coffee & Snacks', date: daysAgo(6) },
    { id: 6,  title: 'Rent',               amount: 850,   type: 'expense', category: 'Housing & Rent',  date: daysAgo(7) },
    { id: 7,  title: 'Bus Pass',           amount: 35,    type: 'expense', category: 'Transportation',  date: daysAgo(8) },
    { id: 8,  title: 'Pharmacy',           amount: 24.5,  type: 'expense', category: 'Healthcare',      date: daysAgo(9) },
    { id: 9,  title: 'Online Shopping',    amount: 54,    type: 'expense', category: 'Shopping',        date: daysAgo(10) },
    { id: 10, title: 'Freelance Project',  amount: 450,   type: 'income',  category: 'Freelance',       date: daysAgo(12) },
  ];
}

const SEED_BUDGETS = [
  { id: 1, category: 'Food & Dining',   limit: 300 },
  { id: 2, category: 'Housing & Rent',  limit: 900 },
  { id: 3, category: 'Entertainment',   limit: 50  },
  { id: 4, category: 'Transportation',  limit: 80  },
];

const CATEGORIES = [
  'Food & Dining', 'Housing & Rent', 'Transportation', 'Entertainment',
  'Shopping', 'Healthcare', 'Coffee & Snacks', 'Utilities',
  'Salary', 'Freelance',
];

// ── Tiny helpers ─────────────────────────────────────────────────────────────
const fmtEur = (n) => `€${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CategoryDot({ cat }) {
  const color = getColor(cat, CATEGORIES.indexOf(cat));
  return <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 inline-block" style={{ backgroundColor: color }} />;
}

// ── Transaction Form (add + edit) ─────────────────────────────────────────────
function TxForm({ initial, onSubmit, onClose }) {
  const { t } = useTranslation();
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(() =>
    initial
      ? { title: initial.title, amount: String(initial.amount), type: initial.type, category: initial.category, date: initial.date }
      : { title: '', amount: '', type: 'expense', category: 'Food & Dining', date: fmt(new Date()) },
  );
  const [error, setError] = useState('');
  const titleRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError(t('demo.errorTitle')); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError(t('demo.errorAmount')); return; }
    // Preserve id on edit; generate a new one on add.
    onSubmit({ ...form, amount: amt, id: isEdit ? initial.id : Date.now() });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && (
        <p className="text-xs text-[#e8394d] bg-rose-50 dark:bg-rose-950/20 rounded-md px-3 py-2">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => set('type', 'expense')}
          className={`flex-1 py-2 text-xs font-medium rounded-md border transition-colors ${form.type === 'expense' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-[#e8394d]' : 'border-surface-hairline dark:border-surface-dark-hairline text-ink-muted dark:text-white hover:border-ink-primary/40 dark:hover:border-white/30'}`}
        >
          {t('transactions.expense')}
        </button>
        <button
          type="button"
          onClick={() => set('type', 'income')}
          className={`flex-1 py-2 text-xs font-medium rounded-md border transition-colors ${form.type === 'income' ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-400 dark:border-brand-700 text-brand-600 dark:text-brand-400' : 'border-surface-hairline dark:border-surface-dark-hairline text-ink-muted dark:text-white hover:border-ink-primary/40 dark:hover:border-white/30'}`}
        >
          {t('transactions.income')}
        </button>
      </div>
      <input
        ref={titleRef}
        autoFocus
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        placeholder={t('demo.titlePlaceholder')}
        className="w-full px-3 py-2 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-elevated text-ink-primary dark:text-white placeholder:text-ink-muted/50 dark:placeholder:text-white/40 focus:outline-none focus:border-brand-500 dark:focus:border-brand-500"
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0.01"
          className="flex-1 px-3 py-2 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-elevated text-ink-primary dark:text-white placeholder:text-ink-muted/50 dark:placeholder:text-white/40 focus:outline-none focus:border-brand-500 dark:focus:border-brand-500"
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
          className="flex-1 px-3 py-2 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-elevated text-ink-primary dark:text-white focus:outline-none focus:border-brand-500 dark:focus:border-brand-500"
        />
      </div>
      <select
        value={form.category}
        onChange={(e) => set('category', e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-elevated text-ink-primary dark:text-white focus:outline-none focus:border-brand-500 dark:focus:border-brand-500"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{t(`defaultCategories.${c}`, c)}</option>
        ))}
      </select>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-md transition-colors"
        >
          {isEdit ? t('demo.saveBtn') : t('demo.addBtn')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium border border-surface-hairline dark:border-surface-dark-hairline text-ink-muted dark:text-white rounded-md hover:bg-surface-page dark:hover:bg-surface-dark-elevated transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

// ── Custom Pie Tooltip ────────────────────────────────────────────────────────
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white dark:bg-surface-dark-elevated border border-surface-hairline dark:border-surface-dark-hairline rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-ink-primary dark:text-white">{name}</p>
      <p className="text-ink-muted dark:text-white">{fmtEur(value)}</p>
    </div>
  );
}

// ── Custom Bar Tooltip ────────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-surface-dark-elevated border border-surface-hairline dark:border-surface-dark-hairline rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-ink-primary dark:text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtEur(p.value)}</p>
      ))}
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
const TABS = ['overview', 'transactions', 'budgets'];

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
        active
          ? 'bg-brand-600 text-white'
          : 'text-ink-muted dark:text-white hover:bg-surface-page dark:hover:bg-surface-dark-elevated'
      }`}
    >
      {children}
    </button>
  );
}

// ── Persistence nudge ─────────────────────────────────────────────────────────
function PersistenceBanner({ onDismiss, onSave }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4 bg-brand-600/10 dark:bg-brand-900/30 border border-brand-500/20 dark:border-brand-700/40 rounded-lg px-4 py-3 text-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-ink-primary dark:text-white font-medium">
          {t('demo.persistenceBanner')}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onSave}
          className="text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md transition-colors"
        >
          {t('demo.saveFree')}
        </button>
        <button
          onClick={onDismiss}
          className="text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-white/80 p-1 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ transactions, isDark }) {
  const { t } = useTranslation();

  const totalIncome = useMemo(
    () => transactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0),
    [transactions],
  );
  const totalExpense = useMemo(
    () => transactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0),
    [transactions],
  );
  const balance = totalIncome - totalExpense;

  const pieData = useMemo(() => {
    const map = {};
    transactions.filter((tx) => tx.type === 'expense').forEach((tx) => {
      map[tx.category] = (map[tx.category] || 0) + tx.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const barData = useMemo(() => {
    const map = {};
    transactions.forEach((tx) => {
      const m = tx.date.slice(0, 7);
      if (!map[m]) map[m] = { month: m, Income: 0, Expense: 0 };
      if (tx.type === 'income') map[m].Income += tx.amount;
      else map[m].Expense += tx.amount;
    });
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-4)
      .map((d) => ({ ...d, month: d.month.slice(5) }));
  }, [transactions]);

  const tickColor = isDark ? '#FFFFFF' : '#6b7280';

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('dashboard.totalIncome'),   value: totalIncome,  color: 'text-brand-600 dark:text-brand-400', border: 'border-l-2 border-l-brand-500' },
          { label: t('dashboard.totalExpenses'),  value: totalExpense, color: 'text-[#e8394d]',                    border: 'border-l-2 border-l-[#e8394d]'  },
          { label: t('dashboard.balance'),        value: balance,      color: balance >= 0 ? 'text-ink-primary dark:text-white' : 'text-[#e8394d]', border: balance >= 0 ? 'border-l-2 border-l-brand-500' : 'border-l-2 border-l-[#e8394d]' },
        ].map((c) => (
          <div key={c.label} className={`bg-white dark:bg-surface-dark-elevated rounded-lg p-3 border border-surface-hairline dark:border-surface-dark-hairline ${c.border}`}>
            <p className="eyebrow text-[9px] mb-1 truncate">{c.label}</p>
            <p className={`text-sm font-bold tabular-nums leading-tight ${c.color}`}>{fmtEur(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="bg-white dark:bg-surface-dark-elevated rounded-lg p-4 border border-surface-hairline dark:border-surface-dark-hairline min-h-[180px]">
          <p className="text-xs font-semibold text-ink-primary dark:text-white mb-3">{t('chart.monthlyOverview')}</p>
          {barData.length > 0 ? (
            <div style={{ width: '100%', height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barGap={2} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2a2a2a' : '#f0f0f0'} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} width={38} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="Income"  fill="#168b78" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Expense" fill="#e8394d" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-xs text-ink-muted dark:text-white">{t('chart.noData')}</div>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-white dark:bg-surface-dark-elevated rounded-lg p-4 border border-surface-hairline dark:border-surface-dark-hairline min-h-[180px]">
          <p className="text-xs font-semibold text-ink-primary dark:text-white mb-3">{t('demo.byCategory')}</p>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-2">
              <div style={{ width: 110, height: 110, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={52} dataKey="value" paddingAngle={1.5}>
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={getColor(entry.name, i)} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                {pieData.slice(0, 5).map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(entry.name, i) }} />
                    <span className="text-ink-primary dark:text-white truncate flex-1">{t(`defaultCategories.${entry.name}`, entry.name)}</span>
                    <span className="text-ink-muted dark:text-white tabular-nums">{fmtEur(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[110px] flex items-center justify-center text-xs text-ink-muted dark:text-white">{t('chart.noData')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Transactions tab ──────────────────────────────────────────────────────────
function TransactionsTab({ transactions, onDelete, onEdit, onAddOpen }) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-ink-primary dark:text-white">{t('transactions.title')}</p>
        <button
          onClick={onAddOpen}
          className="flex items-center gap-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('demo.addTransaction')}
        </button>
      </div>
      <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin pr-0.5">
        {transactions.length === 0 && (
          <p className="text-xs text-ink-muted dark:text-white text-center py-8">{t('transactions.noTransactions')}</p>
        )}
        {[...transactions].sort((a, b) => b.date.localeCompare(a.date)).map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white dark:bg-surface-dark-elevated border border-surface-hairline dark:border-surface-dark-hairline group hover:border-brand-500/40 dark:hover:border-brand-700/40 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CategoryDot cat={tx.category} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-primary dark:text-white truncate">{tx.title}</p>
                <p className="text-[10px] text-ink-muted dark:text-white truncate">{t(`defaultCategories.${tx.category}`, tx.category)} · {tx.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-semibold tabular-nums ${tx.type === 'income' ? 'text-brand-600 dark:text-brand-400' : 'text-[#e8394d]'}`}>
                {tx.type === 'income' ? '+' : '-'}{fmtEur(tx.amount)}
              </span>
              <button
                onClick={() => onEdit(tx)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-muted dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-all"
                aria-label={t('demo.editBtn')}
                title={t('demo.editBtn')}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(tx.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-muted dark:text-white hover:text-[#e8394d] transition-all"
                aria-label="Delete"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Budgets tab ───────────────────────────────────────────────────────────────
function BudgetsTab({ transactions, budgets }) {
  const { t } = useTranslation();

  const spent = useMemo(() => {
    const map = {};
    transactions.filter((tx) => tx.type === 'expense').forEach((tx) => {
      map[tx.category] = (map[tx.category] || 0) + tx.amount;
    });
    return map;
  }, [transactions]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-ink-primary dark:text-white">{t('nav.more')} – {t('budgets.title')}</p>
      {budgets.map((b) => {
        const used = spent[b.category] || 0;
        const pct = Math.min(100, (used / b.limit) * 100);
        const over = pct >= 100;
        const near = pct >= 80 && !over;
        return (
          <div key={b.id} className="bg-white dark:bg-surface-dark-elevated rounded-lg p-3.5 border border-surface-hairline dark:border-surface-dark-hairline">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CategoryDot cat={b.category} />
                <span className="text-xs font-medium text-ink-primary dark:text-white">{t(`defaultCategories.${b.category}`, b.category)}</span>
              </div>
              <span className={`text-[10px] font-semibold tabular-nums ${over ? 'text-[#e8394d]' : near ? 'text-amber-500' : 'text-ink-muted dark:text-white'}`}>
                {fmtEur(used)} / {fmtEur(b.limit)}
              </span>
            </div>
            <div className="h-1.5 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: over ? '#e8394d' : near ? '#f59e0b' : '#168b78',
                }}
              />
            </div>
            <p className={`text-[10px] mt-1.5 ${over ? 'text-[#e8394d]' : 'text-ink-muted dark:text-white'}`}>
              {over
                ? t('demo.overBudget', { amount: fmtEur(used - b.limit) })
                : t('demo.remaining', { amount: fmtEur(b.limit - used) })}
            </p>
          </div>
        );
      })}
      <div className="text-center pt-1">
        <p className="text-[10px] text-ink-muted dark:text-white">{t('demo.budgetSaveHint')}</p>
      </div>
    </div>
  );
}

// ── Main DemoWorkspace ────────────────────────────────────────────────────────
export default function DemoWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState(makeSeedTransactions);
  const [budgets] = useState(SEED_BUDGETS);
  const [tab, setTab] = useState('overview');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [showBanner, setShowBanner] = useState(true);

  // Detect dark mode for chart colours
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const saveAndGo = useCallback(() => {
    saveDemoAndNavigate(transactions, navigate, '/register');
  }, [transactions, navigate]);

  const addTx = useCallback((tx) => {
    setTransactions((prev) => [tx, ...prev]);
  }, []);

  const updateTx = useCallback((tx) => {
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
  }, []);

  const deleteTx = useCallback((id) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    // If the row being edited is deleted, close the form.
    setEditingTx((cur) => (cur && cur.id === id ? null : cur));
  }, []);

  // Open the inline form in edit mode for a given transaction.
  const openEdit = useCallback((tx) => {
    setEditingTx(tx);
    setShowAddForm(true);
    setTab('transactions');
  }, []);

  const closeForm = useCallback(() => {
    setShowAddForm(false);
    setEditingTx(null);
  }, []);

  return (
    <div className="bg-surface-page dark:bg-surface-dark-page border border-surface-hairline dark:border-surface-dark-hairline rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
      <div className="p-4 sm:p-5 space-y-4">
        {/* Persistence banner */}
        {showBanner && (
          <PersistenceBanner onDismiss={() => setShowBanner(false)} onSave={saveAndGo} />
        )}

        {/* Workspace header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-primary dark:text-white">{t('demo.workspaceTitle')}</p>
            <p className="text-[11px] text-ink-muted dark:text-white">{t('demo.workspaceSubtitle')}</p>
          </div>
          {tab === 'transactions' && !showAddForm && (
            <button
              onClick={() => { setEditingTx(null); setShowAddForm(true); }}
              className="flex items-center gap-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('demo.addTransaction')}
            </button>
          )}
          {tab === 'overview' && (
            <button
              onClick={() => { setTab('transactions'); setEditingTx(null); setShowAddForm(true); }}
              className="flex items-center gap-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('demo.addTransaction')}
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-surface-page dark:bg-surface-dark-elevated rounded-lg border border-surface-hairline dark:border-surface-dark-hairline">
          {TABS.map((id) => (
            <Tab key={id} active={tab === id} onClick={() => { setTab(id); closeForm(); }}>
              {t(`demo.tab.${id}`)}
            </Tab>
          ))}
        </div>

        {/* Inline form (slides in) — add or edit depending on editingTx */}
        {showAddForm && (
          <div className="bg-surface-page dark:bg-surface-dark-elevated rounded-xl border border-brand-500/30 dark:border-brand-700/40 p-4 animate-in slide-in-from-top-2 duration-200">
            <p className="text-xs font-semibold text-ink-primary dark:text-white mb-3">
              {editingTx ? t('demo.editNewTransaction') : t('demo.addNewTransaction')}
            </p>
            <TxForm
              key={editingTx ? `edit-${editingTx.id}` : 'add'}
              initial={editingTx}
              onSubmit={editingTx ? updateTx : addTx}
              onClose={closeForm}
            />
          </div>
        )}

        {/* Tab content */}
        {tab === 'overview' && <OverviewTab transactions={transactions} isDark={isDark} />}
        {tab === 'transactions' && (
          <TransactionsTab
            transactions={transactions}
            onDelete={deleteTx}
            onEdit={openEdit}
            onAddOpen={() => { setEditingTx(null); setShowAddForm(true); }}
          />
        )}
        {tab === 'budgets' && <BudgetsTab transactions={transactions} budgets={budgets} />}

        {/* Footer CTA */}
        <div className="border-t border-surface-hairline dark:border-surface-dark-hairline pt-3 flex items-center justify-between">
          <p className="text-[11px] text-ink-muted dark:text-white">{t('demo.footerNote')}</p>
          <button
            onClick={saveAndGo}
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors flex items-center gap-1"
          >
            {t('demo.saveAccount')}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
