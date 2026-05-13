import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Card from '../UI/Card';
import { toCSV, downloadCSV } from '../../utils/csv';
import Modal from '../UI/Modal';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import TransactionForm from '../Transaction/TransactionForm';
import CSVImport from './CSVImport';
import { translateCategoryName, getCategoryIcon } from '../../utils/categoryTranslation';
import { CategoryIconSvg } from '../UI/CategoryIconSvg';
import CustomSelect from '../UI/CustomSelect';
import { processRecurringTransactions, addRecurringTransaction, updateRecurringTransaction, fetchRecurringTransactions, addTransactionWithSplits, updateTransactionWithSplits, fetchTransactionSplits } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../context/TransactionContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { CURRENCY_SYMBOLS, RECURRING_FILTERS } from '../../utils/constants';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

// Category dot color — mirrors the CategoryCard hash-to-color function
const CAT_PALETTE = [
  '#22ad93', '#168b78', '#C9A87C', '#6A8FC4', '#C46A75',
  '#D0A96A', '#8A8A85', '#43c5aa', '#7A756A', '#9B7EB3',
];
function colorFromName(name) {
  if (!name) return CAT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CAT_PALETTE[Math.abs(hash) % CAT_PALETTE.length];
}

export default function Transactions() {
  const {
    transactions: items,
    categories,
    typeFilter,
    setTypeFilter,
    reloadCategories,
    reloadTransactions: onReload,
    addTransaction: onAdd,
    updateTransaction: onUpdate,
    deleteTransaction: onDelete,
  } = useTransactions();
  const { t } = useTranslation();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { canAddTransaction, isPremium, canCreateRecurring, refreshSubscription } = useSubscription();
  const years = useMemo(() => {
    const set = new Set(items.map(i => i.date?.slice(0, 4) || 'Unknown'));
    return ['All', ...Array.from(set).sort((a, b) => b.localeCompare(a))];
  }, [items]);

  const [yearFilter, setYearFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [prefillData, setPrefillData] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [recurringFilter, setRecurringFilter] = useState(RECURRING_FILTERS.ALL);
  const [activeRecurringCount, setActiveRecurringCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const searchInputRef = useRef(null);

  // Process recurring transactions on component mount
  const processRecurring = useCallback(async () => {
    try {
      const result = await processRecurringTransactions();
      if (result.generated > 0) {
        addToast(t('recurring.generatedToast', { count: result.generated }), 'success');
        if (onReload) onReload();
        refreshSubscription();
      }
    } catch (error) {
      console.error('Error processing recurring transactions:', error);
    }
  }, [addToast, t, onReload, refreshSubscription]);

  useEffect(() => {
    fetchRecurringTransactions().then(data => {
      setActiveRecurringCount(data.filter(r => r.is_active).length);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    processRecurring();
  }, [processRecurring]);

  const filtered = useMemo(() => {
    let result = items;
    if (yearFilter !== 'All') {
      result = result.filter(i => i.date?.startsWith(yearFilter));
    }
    if (categoryFilter !== 'All') {
      result = result.filter(i => i.category?.id === categoryFilter);
    }
    if (typeFilter && typeFilter !== 'all') {
      result = result.filter(i => i.type === typeFilter);
    }
    if (recurringFilter === RECURRING_FILTERS.RECURRING) {
      result = result.filter(i => i.source_recurring_id);
    } else if (recurringFilter === RECURRING_FILTERS.REGULAR) {
      result = result.filter(i => !i.source_recurring_id);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        translateCategoryName(i.category?.name || '').toLowerCase().includes(q) ||
        (Array.isArray(i.tags) && i.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [items, yearFilter, categoryFilter, typeFilter, recurringFilter, searchQuery]);

  const INITIAL_DISPLAY_COUNT = 12;
  const visibleItems = useMemo(() => {
    if (showAll) return filtered;
    return filtered.slice(0, INITIAL_DISPLAY_COUNT);
  }, [filtered, showAll]);
  const hasMore = filtered.length > INITIAL_DISPLAY_COUNT;

  useEffect(() => {
    setShowAll(false);
  }, [yearFilter, categoryFilter, typeFilter, recurringFilter, searchQuery]);

  function exportCSV() {
    const csv = toCSV(filtered, t);
    downloadCSV(csv, 'transactions.csv');
  }

  const handleAdd = useCallback(() => {
    if (!canAddTransaction) {
      addToast(t('upgrade.transactionLimitReached'), 'warning');
      navigate('/pricing');
      return;
    }
    setEditTx(null);
    setShowModal(true);
  }, [canAddTransaction, addToast, t, navigate]);

  async function handleEdit(tx) {
    if (tx.has_splits) {
      try {
        const splits = await fetchTransactionSplits(tx.id);
        setEditTx({ ...tx, splits });
      } catch (e) {
        console.error('Failed to load split data:', e);
        setEditTx(tx);
      }
    } else {
      setEditTx(tx);
    }
    setShowModal(true);
  }

  const confirmDelete = useCallback(async () => {
    if (!txToDelete) return;
    setDeleting(true);
    try {
      await onDelete(txToDelete.id);
    } finally {
      setDeleting(false);
      setTxToDelete(null);
    }
  }, [txToDelete, onDelete]);

  useKeyboardShortcuts([
    { key: 'n', alt: true, action: handleAdd },
    { key: 'k', ctrl: true, action: () => searchInputRef.current?.focus() },
  ]);

  useEffect(() => {
    function handleOpenAdd() { handleAdd(); }
    window.addEventListener('openAddTransaction', handleOpenAdd);
    return () => window.removeEventListener('openAddTransaction', handleOpenAdd);
  }, [handleAdd]);

  const selectClass =
    'px-3 py-2.5 text-sm bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white ' +
    'border border-surface-hairline dark:border-surface-dark-hairline rounded-md ' +
    'hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40 ' +
    'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors';

  return (
    <div className="mt-4 sm:mt-6">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <span className="eyebrow">{t('transactions.title')}</span>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink-primary dark:text-white mt-1.5">
              {t('transactions.title')}
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-md font-medium text-sm shadow-sm shadow-brand-500/20 hover:shadow-md hover:shadow-brand-500/30 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              <span className="hidden sm:inline">{t('transactions.addNew')}</span>
              <span className="sm:hidden">{t('forms.add')}</span>
            </button>
            <CSVImport categories={categories} onImportComplete={() => { onReload(); reloadCategories(); }} />
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 border border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white px-4 py-2.5 rounded-md font-medium text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="hidden sm:inline">{t('transactions.export')}</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden inline-flex items-center gap-2 border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white px-4 py-2.5 rounded-md font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {t('transactions.filter')}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-ink-muted dark:text-white/50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('transactions.searchPlaceholder')}
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 border border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-ink-primary dark:text-white/50 dark:hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className={selectClass}>
            {years.map(y => (
              <option key={y} value={y}>{y === 'All' ? t('transactions.allYears') : y}</option>
            ))}
          </select>
          <CustomSelect
            value={categoryFilter}
            onChange={val => setCategoryFilter(val)}
            ariaLabel={t('transactions.all')}
            options={[
              { value: 'All', label: t('transactions.all') },
              ...(Array.isArray(categories) ? categories : []).map(cat => {
                const iconKey = getCategoryIcon(cat);
                return {
                  value: cat.id,
                  label: translateCategoryName(cat.name),
                  leading: (
                    <span className="w-5 h-5 rounded flex items-center justify-center bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex-shrink-0">
                      <CategoryIconSvg iconKey={iconKey || 'Shopping'} className="w-3 h-3" />
                    </span>
                  ),
                };
              }),
            ]}
          />

          {/* Type segmented pill */}
          <div className="inline-flex p-0.5 rounded-full bg-surface-page dark:bg-surface-dark-page border border-surface-hairline dark:border-surface-dark-hairline">
            {['all', 'income', 'expense'].map(type => {
              const active = typeFilter === type;
              const activeClass =
                type === 'income'
                  ? 'bg-brand-600 text-white'
                  : type === 'expense'
                  ? 'bg-[#e8394d] text-white'
                  : 'bg-ink-primary dark:bg-ink-dark-primary text-white dark:text-ink-primary';
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3.5 py-1.5 text-xs font-medium tracking-tight rounded-full transition-colors ${active ? activeClass : 'text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-ink-dark-primary'}`}
                >
                  {type === 'all' ? t('transactions.all') : type === 'income' ? t('transactions.incomes') : t('transactions.expenses')}
                </button>
              );
            })}
          </div>

          {isPremium && (
            <select value={recurringFilter} onChange={e => setRecurringFilter(e.target.value)} className={selectClass}>
              <option value="all">{t('recurring.filterAll')}</option>
              <option value="regular">{t('recurring.filterRegular')}</option>
              <option value="recurring">{t('recurring.filterRecurring')}</option>
            </select>
          )}
        </div>
      </div>


      {filtered.length === 0 ? (
        <div className="border border-surface-hairline dark:border-surface-dark-hairline rounded-[10px] bg-white dark:bg-surface-dark-card">
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-ink-primary dark:text-white mb-2">
              {searchQuery.trim() ? t('transactions.noSearchResults') : t('transactions.noTransactions')}
            </h3>
            <p className="text-sm text-ink-muted dark:text-white mb-6 max-w-sm">
              {searchQuery.trim() ? `"${searchQuery}"` : t('transactions.noTransactionsDesc')}
            </p>
            {items.length === 0 && !searchQuery && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-md font-medium text-sm shadow-sm shadow-brand-500/20 hover:shadow-md hover:shadow-brand-500/30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                {t('transactions.addNew')}
              </button>
            )}
            {items.length > 0 && !searchQuery && (
              <button
                onClick={() => {
                  setYearFilter('All');
                  setCategoryFilter('All');
                  setTypeFilter('all');
                  setRecurringFilter(RECURRING_FILTERS.ALL);
                }}
                className="inline-flex items-center gap-2 border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white px-5 py-2.5 rounded-md font-medium text-sm transition-colors hover:border-ink-muted/40"
              >
                {t('transactions.clearFilters')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="border border-surface-hairline dark:border-surface-dark-hairline rounded-[10px] bg-white dark:bg-surface-dark-card overflow-hidden">
            {/* Column headers — eyebrow */}
            <div className="hidden sm:grid grid-cols-[1fr_140px_160px_100px] gap-4 px-5 py-3 border-b border-surface-hairline dark:border-surface-dark-hairline bg-surface-page/60 dark:bg-surface-dark-page/60">
              <span className="eyebrow">{t('transactions.titleLabel')}</span>
              <span className="eyebrow">{t('transactions.date')}</span>
              <span className="eyebrow text-right">{t('transactions.amount')}</span>
              <span className="eyebrow text-right">{t('transactions.actions', { defaultValue: 'Actions' })}</span>
            </div>

            {/* Rows */}
            <ul className="divide-y divide-surface-hairline dark:divide-surface-dark-hairline">
              {visibleItems.map(item => {
                const catName = item.category?.name || '';
                const dotColor = colorFromName(catName || item.title || 'x');
                const currencySym = CURRENCY_SYMBOLS[item.currency_code || item.currencyCode || 'EUR'] || '';
                const amountStr = Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 });

                return (
                  <li
                    key={item.id}
                    className="group grid grid-cols-1 sm:grid-cols-[1fr_140px_160px_100px] gap-3 sm:gap-4 items-center px-5 py-4 hover:bg-ink-primary/[0.03] dark:hover:bg-ink-dark-primary/[0.04] transition-colors"
                  >
                    {/* Title + category */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dotColor }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-ink-primary dark:text-white truncate">
                            {item.title}
                          </span>
                          {item.source_recurring_id && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-medium bg-surface-page dark:bg-surface-dark-page text-ink-muted dark:text-white border border-surface-hairline dark:border-surface-dark-hairline">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              {t('recurring.badge')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {catName && (
                            <span className="text-xs text-ink-muted dark:text-white truncate">
                              {translateCategoryName(catName)}
                            </span>
                          )}
                          {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <span className="text-xs text-ink-muted dark:text-white truncate">
                              {item.tags.slice(0, 2).map(tag => `#${tag}`).join(' ')}
                              {item.tags.length > 2 && ` +${item.tags.length - 2}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex sm:flex-col sm:items-start items-center gap-2 sm:gap-0">
                      <span className="eyebrow sm:hidden">{t('transactions.date')}</span>
                      <span className="text-sm tabular-nums text-ink-primary dark:text-white">
                        {item.date}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="flex sm:justify-end items-baseline gap-2">
                      <span className="eyebrow sm:hidden">{t('transactions.amount')}</span>
                      <span
                        className={`text-base sm:text-lg font-semibold tabular-nums ${item.type === 'income' ? 'text-brand-600 dark:text-brand-400' : 'text-ink-primary dark:text-white'}`}
                      >
                        {item.type === 'income' ? '+' : '−'}{currencySym}{amountStr}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex sm:justify-end gap-1">
                      <button
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted hover:text-ink-primary dark:text-white dark:hover:text-ink-dark-primary hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
                        onClick={() => handleEdit(item)}
                        title={t('transactions.edit')}
                        aria-label={t('transactions.edit')}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.932Z" />
                        </svg>
                      </button>
                      <button
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted hover:text-red-600 dark:text-white dark:hover:text-red-400 hover:bg-red-500/5 transition-colors"
                        onClick={() => setTxToDelete(item)}
                        title={t('transactions.deleteBtn')}
                        aria-label={t('transactions.deleteBtn')}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowAll(prev => !prev)}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white rounded-md font-medium text-sm transition-colors"
              >
                {showAll ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                    {t('transactions.showLess')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    {t('transactions.showAll', { count: filtered.length })}
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {txToDelete && (
        <ConfirmDeleteModal
          title={t('transactions.delete.title')}
          message={t('transactions.deleteConfirm')}
          itemName={txToDelete.title}
          onConfirm={confirmDelete}
          onCancel={() => setTxToDelete(null)}
          confirmLabel={t('transactions.delete.confirm')}
          cancelLabel={t('transactions.delete.cancel')}
          deleting={deleting}
        />
      )}

      {showModal && (
        <Modal drawer onClose={() => { setShowModal(false); setEditTx(null); setPrefillData(null); }}>
          <TransactionForm
            initial={editTx || prefillData}
            onSubmit={async data => {
              if (editTx) {
                if (data.has_splits && data.splits?.length > 0) {
                  try {
                    await updateTransactionWithSplits(editTx.id, data, data.splits);
                    addToast(t('messages.transactionUpdated'), 'success');
                    await onReload();
                  } catch (e) {
                    console.error('Error updating split transaction:', e);
                    addToast(t('messages.error'), 'error');
                  }
                } else {
                  onUpdate(editTx.id, data);
                }
                setShowModal(false);
                setEditTx(null);
                setPrefillData(null);
              } else if (data.isRecurring) {
                try {
                  await addRecurringTransaction(data);
                  addToast(t('recurring.created'), 'success');
                  await processRecurringTransactions();
                  if (onReload) {
                    await onReload();
                  }
                  await refreshSubscription();
                  setActiveRecurringCount(c => c + 1);
                  setShowModal(false);
                  setEditTx(null);
                  setPrefillData(null);
                } catch (error) {
                  console.error('Error creating recurring transaction:', error);
                  addToast(t('recurring.createError'), 'error');
                }
              } else if (data.has_splits && data.splits?.length > 0) {
                try {
                  await addTransactionWithSplits(data, data.splits);
                  addToast(t('messages.transactionAdded'), 'success');
                  await onReload();
                  await refreshSubscription();
                } catch (e) {
                  console.error('Error adding split transaction:', e);
                  addToast(t('messages.error'), 'error');
                }
                setShowModal(false);
                setEditTx(null);
                setPrefillData(null);
              } else if (onAdd) {
                await onAdd(data);
                setShowModal(false);
                setEditTx(null);
                setPrefillData(null);
              }
            }}
            onCancel={() => { setShowModal(false); setEditTx(null); setPrefillData(null); }}
            onCategoryAdded={reloadCategories}
            allowRecurring={!editTx && (isPremium || canCreateRecurring(activeRecurringCount))}
          />
        </Modal>
      )}
    </div>
  );
}
