import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Download, Search, X, SlidersHorizontal, Pencil, Trash2, Repeat, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { toCSV, downloadCSV } from '../../utils/csv';
import Modal from '../UI/Modal';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import TransactionForm from '../Transaction/TransactionForm';
import CSVImport from './CSVImport';
import { translateCategoryName, getCategoryIcon } from '../../utils/categoryTranslation';
import { CategoryIconSvg } from '../UI/CategoryIconSvg';
import CustomSelect from '../UI/CustomSelect';
import { processRecurringTransactions, addRecurringTransaction, updateRecurringTransaction, fetchRecurringTransactions, addTransactionWithSplits, updateTransactionWithSplits, fetchTransactionSplits, fetchSplitsForTransactions } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../context/TransactionContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { RECURRING_FILTERS } from '../../utils/constants';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import CategoryAvatar from '../UI/CategoryAvatar';
import { formatShortDay, toISODate } from '../../utils/date';

// Consecutive rows sharing a date become one group, in list order (the list
// arrives newest first), so the ledger reads like a bank statement.
function groupByDate(rows) {
  const groups = [];
  for (const row of rows) {
    const key = row.date?.slice(0, 10) || '';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(row);
    else groups.push({ key, items: [row] });
  }
  return groups;
}

/**
 * variant="full"   — the /transactions page: search, filters, import/export.
 * variant="recent" — the dashboard's recent-activity card. Same component on
 *   purpose: it owns the add/edit drawer, the `openAddTransaction` listener and
 *   recurring processing, all of which the dashboard relies on.
 */
export default function Transactions({ variant = 'full', limit = 6 }) {
  const isRecent = variant === 'recent';
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
  const { t, i18n } = useTranslation();
  const { format: formatCurrency, currency } = useDisplayCurrency();
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
  // transaction_id -> [{ category_id, categoryName, amount }], largest first
  const [splitsByTx, setSplitsByTx] = useState({});
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

  // Split transactions carry category_id = NULL on the parent row (the money
  // belongs to the child rows), so without this the list shows them as
  // uncategorised and the category filter never matches them. Loaded for every
  // split transaction, not just the visible page, because filtering runs over
  // the whole set. One batched query, refreshed when the data changes.
  // Keyed on a joined id string so the effect only refires when the actual set
  // of split transactions changes, not on every re-render of `items`.
  const splitParentKey = useMemo(
    () => items.filter(i => i.has_splits).map(i => i.id).sort().join(','),
    [items]
  );

  useEffect(() => {
    if (!splitParentKey) {
      setSplitsByTx({});
      return;
    }
    let cancelled = false;
    fetchSplitsForTransactions(splitParentKey.split(','))
      .then(map => { if (!cancelled) setSplitsByTx(map); })
      .catch(e => console.error('Failed to load split categories:', e));
    return () => { cancelled = true; };
  }, [splitParentKey]);

  useEffect(() => {
    processRecurring();
  }, [processRecurring]);

  const filtered = useMemo(() => {
    let result = items;
    if (yearFilter !== 'All') {
      result = result.filter(i => i.date?.startsWith(yearFilter));
    }
    if (categoryFilter !== 'All') {
      // A split transaction matches when ANY of its parts is in the category.
      // Its own category_id is NULL, so matching only on that silently hid
      // split rows from every category filter.
      result = result.filter(i =>
        i.category?.id === categoryFilter ||
        (i.has_splits && (splitsByTx[i.id] || []).some(s => s.category_id === categoryFilter))
      );
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
        // Searching a category name should also surface split transactions
        // that spend into it.
        (i.has_splits && (splitsByTx[i.id] || []).some(s =>
          translateCategoryName(s.categoryName || '').toLowerCase().includes(q)
        )) ||
        (Array.isArray(i.tags) && i.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [items, yearFilter, categoryFilter, typeFilter, recurringFilter, searchQuery, splitsByTx]);

  const INITIAL_DISPLAY_COUNT = 40;
  const visibleItems = useMemo(() => {
    if (showAll) return filtered;
    return filtered.slice(0, INITIAL_DISPLAY_COUNT);
  }, [filtered, showAll]);
  const hasMore = filtered.length > INITIAL_DISPLAY_COUNT;

  useEffect(() => {
    setShowAll(false);
  }, [yearFilter, categoryFilter, typeFilter, recurringFilter, searchQuery]);

  function exportCSV() {
    const csv = toCSV(filtered, t, currency);
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
    'px-3 py-2 text-sm bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white ' +
    'border border-surface-hairline dark:border-surface-dark-hairline rounded-md ' +
    'hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40 ' +
    'focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 transition-colors';

  const todayKey = toISODate(new Date());
  const yesterdayKey = toISODate(new Date(Date.now() - 86400000));
  const thisYear = String(new Date().getFullYear());
  function dayLabel(key) {
    if (key === todayKey) return t('transactions.today');
    if (key === yesterdayKey) return t('transactions.yesterday');
    if (!key) return '';
    const d = new Date(`${key}T00:00:00`);
    if (Number.isNaN(d.getTime())) return key;
    return formatShortDay(d, i18n.language, { withYear: !key.startsWith(thisYear) });
  }

  const rows = isRecent ? items.slice(0, limit) : visibleItems;
  const groups = groupByDate(rows);

  const resetFilters = () => {
    setYearFilter('All');
    setCategoryFilter('All');
    setTypeFilter('all');
    setRecurringFilter(RECURRING_FILTERS.ALL);
  };

  const renderRow = (item) => {
    const catName = item.category?.name || '';
    // Split rows have no single category: label them with their parts
    // (largest share first) so the line is never blank.
    const itemSplits = item.has_splits ? (splitsByTx[item.id] || []) : [];
    const splitNames = itemSplits.map(s => s.categoryName).filter(Boolean);
    const iconCategory = item.category
      || (Array.isArray(categories) ? categories.find(c => c.id === itemSplits[0]?.category_id) : null);
    const amountStr = formatCurrency(Number(item.amount));
    const metaParts = [];
    if (catName) {
      metaParts.push(translateCategoryName(catName));
    } else if (splitNames.length > 0) {
      metaParts.push(
        splitNames.slice(0, 2).map(translateCategoryName).join(', ') +
        (splitNames.length > 2 ? ` +${splitNames.length - 2}` : '')
      );
    }
    if (Array.isArray(item.tags) && item.tags.length > 0) {
      metaParts.push(
        item.tags.slice(0, 2).map(tag => `#${tag}`).join(' ') +
        (item.tags.length > 2 ? ` +${item.tags.length - 2}` : '')
      );
    }

    return (
      <li key={item.id} className="group relative flex items-center hover:bg-ink-primary/[0.025] dark:hover:bg-ink-dark-primary/[0.04] transition-colors">
        <button
          type="button"
          onClick={() => handleEdit(item)}
          title={t('transactions.edit')}
          className="flex-1 min-w-0 flex items-center gap-3 pl-4 sm:pl-5 pr-3 py-3 text-left focus:outline-none focus-visible:bg-ink-primary/[0.04]"
        >
          <CategoryAvatar category={iconCategory} fallbackName={splitNames[0] || item.title} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-ink-primary dark:text-white truncate">{item.title}</span>
              {item.source_recurring_id && (
                <span className="inline-flex items-center gap-1 shrink-0 text-[11px] font-medium text-ink-muted dark:text-white" title={t('recurring.badge')}>
                  <Repeat className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
                  <span className="hidden sm:inline">{t('recurring.badge')}</span>
                </span>
              )}
            </span>
            {metaParts.length > 0 && (
              <span className="block text-xs text-ink-muted dark:text-white truncate mt-0.5">
                {metaParts.join(' · ')}
              </span>
            )}
          </span>
          <span
            className={`shrink-0 text-sm font-semibold tabular-nums ${item.type === 'income' ? 'text-brand-600 dark:text-brand-400' : 'text-ink-primary dark:text-white'}`}
          >
            {item.type === 'income' ? '+' : '−'}{amountStr}
          </span>
        </button>
        {!isRecent && (
          <div className="flex items-center gap-0.5 pr-2 sm:pr-3 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
            <button
              className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted hover:text-ink-primary dark:text-white hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
              onClick={() => handleEdit(item)}
              title={t('transactions.edit')}
              aria-label={t('transactions.edit')}
            >
              <Pencil className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted hover:text-expense dark:text-white dark:hover:text-expense hover:bg-expense/5 transition-colors"
              onClick={() => setTxToDelete(item)}
              title={t('transactions.deleteBtn')}
              aria-label={t('transactions.deleteBtn')}
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </li>
    );
  };

  const renderGroups = () => (
    <div>
      {groups.map(group => {
        const dayNet = group.items.reduce(
          (sum, i) => sum + (i.type === 'income' ? 1 : -1) * (Number(i.amount) || 0),
          0
        );
        return (
          <section key={group.key || 'nodate'}>
            <div className="flex items-center justify-between px-4 sm:px-5 py-2 bg-surface-page dark:bg-surface-dark-page border-y border-surface-hairline dark:border-surface-dark-hairline">
              <h3 className="text-xs font-medium text-ink-muted dark:text-white">{dayLabel(group.key)}</h3>
              {!isRecent && (
                <span className="text-xs font-medium tabular-nums text-ink-muted dark:text-white">
                  {dayNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(dayNet))}
                </span>
              )}
            </div>
            <ul className="divide-y divide-surface-hairline dark:divide-surface-dark-hairline">
              {group.items.map(renderRow)}
            </ul>
          </section>
        );
      })}
    </div>
  );

  // Delete confirm + add/edit drawer, shared by both variants.
  const modals = (
    <>
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
    </>
  );

  // ── Dashboard: recent activity card ────────────────────────────────────
  if (isRecent) {
    return (
      <>
        {items.length > 0 && (
          <div className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 py-4">
              <h2 className="text-heading text-ink-primary dark:text-white">{t('transactions.recent')}</h2>
              <Link
                to="/transactions"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700"
              >
                {t('transactions.viewAll')}
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </Link>
            </div>
            {renderGroups()}
          </div>
        )}
        {modals}
      </>
    );
  }

  // ── /transactions page ─────────────────────────────────────────────────
  const hasActiveFilters =
    yearFilter !== 'All' || categoryFilter !== 'All' || (typeFilter && typeFilter !== 'all') ||
    recurringFilter !== RECURRING_FILTERS.ALL;

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-title font-display text-ink-primary dark:text-white">
            {t('transactions.title')}
          </h1>
          <p className="text-sm text-ink-muted dark:text-white mt-1 tabular-nums">
            {t('transactions.count', { count: items.length })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <CSVImport categories={categories} onImportComplete={() => { onReload(); reloadCategories(); }} />
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 border border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white px-3.5 py-2 rounded-md font-medium text-sm transition-colors"
          >
            <Download className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">{t('transactions.export')}</span>
            <span className="sm:hidden">CSV</span>
          </button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">{t('transactions.addNew')}</span>
            <span className="sm:hidden">{t('forms.add')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline overflow-hidden">
        {/* Toolbar: search + filters */}
        <div className="p-3 sm:p-4 border-b border-surface-hairline dark:border-surface-dark-hairline space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-ink-muted dark:text-white/60">
                <Search className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('transactions.searchPlaceholder')}
                aria-label={t('transactions.search')}
                className="w-full pl-9 pr-9 py-2 text-sm bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/50 dark:placeholder:text-white/40 border border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2.5 flex items-center text-ink-muted hover:text-ink-primary dark:text-white dark:hover:text-white"
                  aria-label={t('transactions.clearFilters')}
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              className={`sm:hidden inline-flex items-center gap-2 border px-3 py-2 rounded-md font-medium text-sm text-ink-primary dark:text-white transition-colors ${
                showFilters || hasActiveFilters
                  ? 'border-ink-muted/50 dark:border-white/40'
                  : 'border-surface-hairline dark:border-surface-dark-hairline'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={1.75} />
              {t('transactions.filter')}
            </button>
          </div>

          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex items-center gap-2 flex-wrap`}>
            {/* Type segmented control */}
            <div className="inline-flex p-0.5 rounded-md bg-surface-subtle dark:bg-surface-dark-subtle">
              {['all', 'income', 'expense'].map(type => {
                const active = typeFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 text-xs font-medium rounded-[5px] transition-colors ${
                      active
                        ? 'bg-white dark:bg-surface-dark-elevated text-ink-primary dark:text-white shadow-xs'
                        : 'text-ink-muted dark:text-white hover:text-ink-primary'
                    }`}
                  >
                    {type === 'all' ? t('transactions.all') : type === 'income' ? t('transactions.incomes') : t('transactions.expenses')}
                  </button>
                );
              })}
            </div>

            <div className="w-[200px]">
              <CustomSelect
                value={categoryFilter}
                onChange={val => setCategoryFilter(val)}
                ariaLabel={t('transactions.category')}
                className="!px-3 !py-2 !text-sm"
                options={[
                  { value: 'All', label: t('transactions.all') },
                  ...(Array.isArray(categories) ? categories : []).map(cat => {
                    const iconKey = getCategoryIcon(cat);
                    return {
                      value: cat.id,
                      label: translateCategoryName(cat.name),
                      leading: (
                        <span className="w-5 h-5 rounded flex items-center justify-center bg-surface-subtle dark:bg-surface-dark-subtle text-brand-600 dark:text-brand-400 flex-shrink-0">
                          <CategoryIconSvg iconKey={iconKey || 'Shopping'} className="w-3 h-3" />
                        </span>
                      ),
                    };
                  }),
                ]}
              />
            </div>

            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className={selectClass} aria-label={t('transactions.allYears')}>
              {years.map(y => (
                <option key={y} value={y}>{y === 'All' ? t('transactions.allYears') : y}</option>
              ))}
            </select>

            {isPremium && (
              <select value={recurringFilter} onChange={e => setRecurringFilter(e.target.value)} className={selectClass} aria-label={t('recurring.filterAll')}>
                <option value="all">{t('recurring.filterAll')}</option>
                <option value="regular">{t('recurring.filterRegular')}</option>
                <option value="recurring">{t('recurring.filterRecurring')}</option>
              </select>
            )}

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-2 py-2 text-sm font-medium text-ink-muted dark:text-white hover:text-ink-primary underline-offset-2 hover:underline"
              >
                {t('transactions.clearFilters')}
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Search className="w-6 h-6 text-ink-muted dark:text-white/60 mb-4" strokeWidth={1.75} />
            <h3 className="text-heading text-ink-primary dark:text-white mb-1.5">
              {searchQuery.trim() ? t('transactions.noSearchResults') : t('transactions.noTransactions')}
            </h3>
            <p className="text-sm text-ink-muted dark:text-white mb-6 max-w-sm">
              {searchQuery.trim() ? `"${searchQuery}"` : t('transactions.noTransactionsDesc')}
            </p>
            {items.length === 0 && !searchQuery && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                {t('transactions.addNew')}
              </button>
            )}
            {items.length > 0 && !searchQuery && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white px-4 py-2 rounded-md font-medium text-sm transition-colors hover:border-ink-muted/40"
              >
                {t('transactions.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <>
            {renderGroups()}
            {hasMore && (
              <div className="flex justify-center p-3 border-t border-surface-hairline dark:border-surface-dark-hairline">
                <button
                  onClick={() => setShowAll(prev => !prev)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-ink-primary dark:text-white rounded-md font-medium text-sm hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="w-4 h-4" strokeWidth={1.75} />
                      {t('transactions.showLess')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" strokeWidth={1.75} />
                      {t('transactions.showAll', { count: filtered.length })}
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {modals}
    </div>
  );
}
