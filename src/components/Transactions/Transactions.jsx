import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Search, X, SlidersHorizontal, Pencil, Trash2, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { toCSV, downloadCSV } from '../../utils/csv';
import Modal from '../UI/Modal';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import TransactionForm from '../Transaction/TransactionForm';
import CSVImport from './CSVImport';
import { translateCategoryName } from '../../utils/categoryTranslation';
import CustomSelect from '../UI/CustomSelect';
import { processRecurringTransactions, addRecurringTransaction, updateRecurringTransaction, fetchRecurringTransactions, addTransactionWithSplits, updateTransactionWithSplits, fetchTransactionSplits, fetchSplitsForTransactions } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../context/TransactionContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { RECURRING_FILTERS } from '../../utils/constants';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import CategoryAvatar from '../UI/CategoryAvatar';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Chip from '../UI/Chip';
import PageHeader from '../UI/PageHeader';
import SegmentedControl from '../UI/SegmentedControl';
import { ActivityRow, DayHeader, useDayLabel, useFreshIds } from '../Dashboard/ActivityFeed';
import { rowDelay } from '../../utils/motion';
import { signed } from '../../utils/bento';

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
 * variant="host"   — no list at all: only the add/edit sheet, the listeners
 *   and recurring processing. The Bento dashboard mounts this and renders its
 *   own Activity feed, whose rows open the edit sheet via `openEditTransaction`.
 */
export default function Transactions({ variant = 'full', limit = 6 }) {
  const isRecent = variant === 'recent' || variant === 'host';
  const isHost = variant === 'host';
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

  // Due recurring entries are posted app-wide by TransactionContext (on load
  // and when the tab returns), so this page no longer runs its own pass.

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

  // Rows rendered outside this component (dashboard Activity feed) ask for the
  // edit sheet with the transaction in event.detail.
  const handleEditRef = useRef(null);
  handleEditRef.current = handleEdit;
  useEffect(() => {
    function handleOpenEdit(e) { if (e.detail) handleEditRef.current(e.detail); }
    window.addEventListener('openEditTransaction', handleOpenEdit);
    return () => window.removeEventListener('openEditTransaction', handleOpenEdit);
  }, []);

  const dayLabel = useDayLabel();
  const fresh = useFreshIds(items, false);
  const filterKey = [yearFilter, categoryFilter, typeFilter, recurringFilter, searchQuery.trim()].join('|');

  const rows = isRecent ? items.slice(0, limit) : visibleItems;
  const groups = groupByDate(rows);

  const resetFilters = () => {
    setYearFilter('All');
    setCategoryFilter('All');
    setTypeFilter('all');
    setRecurringFilter(RECURRING_FILTERS.ALL);
  };

  const renderRow = (item, delay) => {
    const catName = item.category?.name || '';
    // Split rows have no single category: label them with their parts
    // (largest share first) so the line is never blank.
    const itemSplits = item.has_splits ? (splitsByTx[item.id] || []) : [];
    const splitNames = itemSplits.map(s => s.categoryName).filter(Boolean);
    const iconCategory = item.category
      || (Array.isArray(categories) ? categories.find(c => c.id === itemSplits[0]?.category_id) : null);
    const metaParts = [];
    if (catName) {
      metaParts.push(translateCategoryName(catName));
    } else if (splitNames.length > 0) {
      metaParts.push(
        splitNames.slice(0, 2).map(translateCategoryName).join(', ') +
        (splitNames.length > 2 ? ` +${splitNames.length - 2}` : '')
      );
    }
    if (item.source_recurring_id) metaParts.push(t('recurring.badge'));
    if (Array.isArray(item.tags) && item.tags.length > 0) {
      metaParts.push(
        item.tags.slice(0, 2).map(tag => `#${tag}`).join(' ') +
        (item.tags.length > 2 ? ` +${item.tags.length - 2}` : '')
      );
    }

    const iconBtn = 'btn-motion inline-flex items-center justify-center w-11 h-11 rounded-pill text-fg hover:bg-inner-2';
    return (
      <ActivityRow
        key={item.id}
        tx={item}
        category={iconCategory}
        meta={metaParts.join(' · ')}
        delay={delay}
        fresh={fresh.has(item.id)}
        onOpen={() => handleEdit(item)}
        openLabel={t('transactions.edit')}
        actions={!isRecent && (
          <>
            <button
              type="button"
              className={`hidden sm:inline-flex ${iconBtn}`}
              onClick={() => handleEdit(item)}
              title={t('transactions.edit')}
              aria-label={t('transactions.edit')}
            >
              <Pencil className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${iconBtn} hover:text-danger`}
              onClick={() => setTxToDelete(item)}
              title={t('transactions.deleteBtn')}
              aria-label={t('transactions.deleteBtn')}
            >
              <Trash2 className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
            </button>
          </>
        )}
      />
    );
  };

  // Day groups in the Activity design (spec 4.2). Rows rise in on mount and
  // whenever a filter changes (the list is keyed on the filter set).
  const renderGroups = () => {
    let n = 0;
    return (
      <div key={filterKey} className="flex flex-col gap-1">
        {groups.map(group => {
          const dayNet = group.items.reduce(
            (sum, i) => sum + (i.type === 'income' ? 1 : -1) * (Number(i.amount) || 0),
            0
          );
          const headerDelay = rowDelay(n++, 0);
          return (
            <section key={group.key || 'nodate'}>
              <DayHeader label={dayLabel(group.key)} net={dayNet} delay={headerDelay} withActions={!isRecent} />
              <ul className="flex flex-col gap-1">
                {group.items.map(item => renderRow(item, rowDelay(n++, 0)))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  };

  // Quick-add toast (design-system 3.6): "Saved: {title} {amount}".
  const savedMessage = (data) => t('transactions.savedToast', {
    title: data.title,
    amount: signed(formatCurrency(Number(data.amount)), data.type === 'income'),
    interpolation: { escapeValue: false },
  });

  // Delete confirm + add/edit sheet, shared by both variants.
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
        <Modal
          variant="sheet"
          ariaLabel={editTx ? t('transactions.editTransaction') : t('transactions.addNew')}
          onClose={() => { setShowModal(false); setEditTx(null); setPrefillData(null); }}
        >
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
                  addToast(savedMessage(data), 'success');
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
                await onAdd(data, { successMessage: savedMessage(data) });
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

  if (isHost) return modals;

  // ── Dashboard: recent activity card (legacy variant) ──────────────────
  if (isRecent) {
    return (
      <>
        {items.length > 0 && (
          <Card padding="sm">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="text-h3 font-bold text-fg">{t('transactions.recent')}</h2>
              <Link to="/transactions" className="group inline-flex items-center gap-1.5 text-sm font-bold text-brand-text">
                {t('transactions.viewAll')}
                <ArrowRight className="arrow-nudge w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
              </Link>
            </div>
            {renderGroups()}
          </Card>
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
      <PageHeader
        title={t('transactions.title')}
        chip={t('transactions.count', { count: items.length })}
        actions={(
          <>
            <CSVImport categories={categories} onImportComplete={() => { onReload(); reloadCategories(); }} />
            <Button variant="secondary" onClick={exportCSV} type="button">
              <Download className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
              <span className="hidden sm:inline">{t('transactions.export')}</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <Button onClick={handleAdd} leading="plus" type="button">
              <span className="hidden sm:inline">{t('transactions.addNew')}</span>
              <span className="sm:hidden">{t('forms.add')}</span>
            </Button>
          </>
        )}
      />

      <Card index={0} padding="sm" className="flex flex-col gap-gap">
        {/* Toolbar: search + filters */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-fg">
                <Search className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('transactions.searchPlaceholder')}
                aria-label={t('transactions.search')}
                className="w-full min-h-11 pl-11 pr-11 py-2.5 text-base font-bold bg-tile text-fg placeholder:font-medium placeholder:text-ink-muted/50 dark:placeholder:text-white/40 border-2 border-line hover:border-inner-2 focus:border-brand-600 dark:focus:border-brand-400 rounded-input btn-motion"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="btn-motion absolute inset-y-0 right-0.5 my-auto w-11 h-11 flex items-center justify-center rounded-pill text-fg hover:bg-inner"
                  aria-label={t('transactions.clearFilters')}
                >
                  <X className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
                </button>
              )}
            </div>
            <Chip
              onClick={() => setShowFilters(!showFilters)}
              selected={showFilters || hasActiveFilters}
              aria-expanded={showFilters}
              className="sm:hidden"
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
              {t('transactions.filter')}
            </Chip>
          </div>

          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex items-center gap-2 flex-wrap`}>
            <SegmentedControl
              ariaLabel={t('transactions.type')}
              value={typeFilter || 'all'}
              onChange={setTypeFilter}
              size="sm"
              options={[
                { value: 'all', label: t('transactions.all') },
                { value: 'expense', label: t('transactions.expenses') },
                { value: 'income', label: t('transactions.incomes') },
              ]}
            />

            <div className="w-[220px]">
              <CustomSelect
                value={categoryFilter}
                onChange={val => setCategoryFilter(val)}
                ariaLabel={t('transactions.category')}
                className="!py-2 !text-sm"
                options={[
                  { value: 'All', label: t('transactions.all') },
                  ...(Array.isArray(categories) ? categories : []).map(cat => ({
                    value: cat.id,
                    label: translateCategoryName(cat.name),
                    leading: <CategoryAvatar category={cat} size="sm" />,
                  })),
                ]}
              />
            </div>

            <div className="w-[170px]">
              <CustomSelect
                value={yearFilter}
                onChange={val => setYearFilter(val)}
                ariaLabel={t('transactions.allYears')}
                className="!py-2 !text-sm"
                options={years.map(y => ({
                  value: y,
                  label: y === 'All' ? t('transactions.allYears') : y,
                }))}
              />
            </div>

            {isPremium && (
              <div className="w-[200px]">
                <CustomSelect
                  value={recurringFilter}
                  onChange={val => setRecurringFilter(val)}
                  ariaLabel={t('recurring.filterAll')}
                  className="!py-2 !text-sm"
                  options={[
                    { value: 'all', label: t('recurring.filterAll') },
                    { value: 'regular', label: t('recurring.filterRegular') },
                    { value: 'recurring', label: t('recurring.filterRecurring') },
                  ]}
                />
              </div>
            )}

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" type="button" onClick={resetFilters}>
                {t('transactions.clearFilters')}
              </Button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="tile-inner flex flex-col items-center justify-center py-14 px-4 text-center">
            <span className="w-12 h-12 rounded-icon bg-tile text-brand-text flex items-center justify-center mb-4" aria-hidden="true">
              <Search className="w-[22px] h-[22px]" strokeWidth={2} />
            </span>
            <h3 className="text-h3 font-bold text-fg mb-1.5">
              {searchQuery.trim() ? t('transactions.noSearchResults') : t('transactions.noTransactions')}
            </h3>
            <p className="text-base text-fg mb-6 max-w-sm [overflow-wrap:anywhere]">
              {searchQuery.trim() ? `"${searchQuery}"` : t('transactions.noTransactionsDesc')}
            </p>
            {items.length === 0 && !searchQuery && (
              <Button onClick={handleAdd} leading="plus" type="button">
                {t('transactions.addNew')}
              </Button>
            )}
            {items.length > 0 && !searchQuery && (
              <Button variant="secondary" onClick={resetFilters} type="button">
                {t('transactions.clearFilters')}
              </Button>
            )}
          </div>
        ) : (
          <>
            {renderGroups()}
            {hasMore && (
              <div className="flex justify-center">
                <Button variant="ghost" type="button" onClick={() => setShowAll(prev => !prev)}>
                  {showAll ? (
                    <>
                      <ChevronUp className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
                      {t('transactions.showLess')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
                      {t('transactions.showAll', { count: filtered.length })}
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {modals}
    </div>
  );
}
