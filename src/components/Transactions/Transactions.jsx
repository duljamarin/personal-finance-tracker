import { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import { toCSV, downloadCSV } from '../../utils/csv';
import Modal from '../UI/Modal';
import TransactionForm from '../Transaction/TransactionForm';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { processRecurringTransactions, addRecurringTransaction, updateRecurringTransaction, fetchRecurringTransactions } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { CURRENCY_SYMBOLS, RECURRING_FILTERS } from '../../utils/constants';

// Accept onAdd for new transactions
export default function Transactions({ items, onDelete, onUpdate, onAdd, categories, typeFilter, setTypeFilter, reloadCategories, onReload }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const years = useMemo(() => {
    const set = new Set(items.map(i => i.date?.slice(0, 4) || 'Unknown'));
    return ['All', ...Array.from(set).sort((a, b) => b.localeCompare(a))];
  }, [items]);

  const [yearFilter, setYearFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [recurringFilter, setRecurringFilter] = useState(RECURRING_FILTERS.ALL);

  // Process recurring transactions on component mount
  const processRecurring = useCallback(async () => {
    try {
      const result = await processRecurringTransactions();
      if (result.generated > 0) {
        addToast(t('recurring.generatedToast', { count: result.generated }), 'success');
        if (onReload) onReload();
      }
    } catch (error) {
      console.error('Error processing recurring transactions:', error);
    }
  }, [addToast, t, onReload]);

  useEffect(() => {
    processRecurring();
    
    // Check if there are pending updates from goals
    const needsRefresh = localStorage.getItem('transactions_needs_refresh');
    if (needsRefresh === 'true') {
      localStorage.removeItem('transactions_needs_refresh');
      if (onReload) {
        // Small delay to ensure data is persisted
        setTimeout(() => onReload(), 100);
      }
    }
  }, [processRecurring, onReload]);

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
    // Recurring filter
    if (recurringFilter === RECURRING_FILTERS.RECURRING) {
      result = result.filter(i => i.source_recurring_id);
    } else if (recurringFilter === RECURRING_FILTERS.REGULAR) {
      result = result.filter(i => !i.source_recurring_id);
    }
    return result;
  }, [items, yearFilter, categoryFilter, typeFilter, recurringFilter]);

  function exportCSV() {
    const csv = toCSV(filtered, t);
    downloadCSV(csv, 'transactions.csv');
  }

  function handleAdd() {
    setEditTx(null);
    setShowModal(true);
  }

  function handleEdit(tx) {
    setEditTx(tx);
    setShowModal(true);
  }

  return (
    <Card className="mt-4 sm:mt-6">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-t-2xl p-4 sm:p-6 mb-4 shadow-md border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">{t('transactions.title')}</h2>
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handleAdd}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-6 py-3 rounded-xl shadow-md hover:from-green-600 hover:to-emerald-700 hover:shadow-lg transition-all font-semibold text-sm sm:text-base min-h-[48px]"
            >
              <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' /></svg>
              <span className="hidden sm:inline">{t('transactions.addNew')}</span>
              <span className="sm:hidden">{t('forms.add')}</span>
            </button>
            <button onClick={exportCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 sm:px-6 py-3 rounded-xl shadow-md hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg transition-all font-semibold text-sm sm:text-base min-h-[48px]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="hidden sm:inline">{t('transactions.export')}</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-xl shadow-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-semibold text-sm min-h-[48px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {t('transactions.filter')}
            </button>
          </div>
        </div>
        <div className={`flex flex-wrap items-center gap-2 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
          {/* Year filter */}
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="px-3 py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:border-green-500 dark:focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 min-w-[100px] sm:min-w-[120px] font-medium transition shadow-sm min-h-[48px]"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:border-green-500 dark:focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 min-w-[120px] sm:min-w-[160px] font-medium transition shadow-sm min-h-[48px]"
          >
            <option value="All">{t('transactions.all')}</option>
            {(Array.isArray(categories) ? categories : []).map(cat => (
              <option key={cat.id} value={cat.id}>{translateCategoryName(cat.name)}</option>
            ))}
          </select>
          {/* Type filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'income', 'expense'].map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-3 text-sm sm:text-base rounded-lg font-semibold border-2 transition-all shadow-sm min-h-[48px] ${typeFilter === type
                  ? (type === 'income'
                      ? 'bg-green-600 text-white border-green-700 shadow-md scale-105'
                      : type === 'expense'
                        ? 'bg-red-600 text-white border-red-700 shadow-md scale-105'
                        : 'bg-blue-600 text-white border-blue-700 shadow-md scale-105')
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
              >
                {type === 'all' ? t('transactions.all') : type === 'income' ? t('transactions.incomes') : t('transactions.expenses')}
              </button>
            ))}
          </div>
          {/* Recurring filter */}
          <select
            value={recurringFilter}
            onChange={e => setRecurringFilter(e.target.value)}
            className="px-3 py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 min-w-[120px] font-medium transition shadow-sm min-h-[48px]"
          >
            <option value="all">{t('recurring.filterAll')}</option>
            <option value="regular">{t('recurring.filterRegular')}</option>
            <option value="recurring">{t('recurring.filterRecurring')}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <h3 className="text-gray-700 dark:text-gray-300 text-lg sm:text-xl font-bold mb-2">{t('transactions.noTransactions')}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-6 max-w-sm">
            {items.length === 0 
              ? t('transactions.noTransactions')
              : t('transactions.noTransactions')}
          </p>
          {items.length === 0 && (
            <button
              onClick={handleAdd}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-700 hover:shadow-xl hover:scale-105 transition-all font-semibold text-base sm:text-lg"
            >
              <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' /></svg>
              {t('transactions.addNew')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filtered.map(item => (
            <div
              key={item.id}
              className={`bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg hover:shadow-2xl p-5 sm:p-6 flex flex-col border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-all duration-300 group backdrop-blur-sm ${item.is_scheduled ? 'opacity-75' : ''}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-lg sm:text-xl text-gray-800 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{item.title}</span>
                  {/* Recurring/Scheduled Badges */}
                  <div className="flex gap-1.5 flex-wrap">
                    {item.source_recurring_id && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 dark:border dark:border-purple-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t('recurring.badge')}
                      </span>
                    )}
                    {item.is_scheduled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 dark:border dark:border-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('recurring.scheduledBadge')}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm ${item.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 dark:border dark:border-green-600' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 dark:border dark:border-red-600'}`}>{item.type === 'income' ? t('transactions.income') : t('transactions.expense')}</span>
              </div>
              {
              <div className="text-gray-500 dark:text-gray-400 text-sm mb-3 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {item.date}
              </div>
              }
          
              {Array.isArray(item.tags) && item.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {item.tags.map(tag => (
                    <span key={tag} className="bg-gray-100 dark:bg-gray-700/60 dark:border dark:border-gray-600 rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">#{tag}</span>
                  ))}
                </div>
              )}
              <div className="font-bold text-2xl sm:text-3xl text-gray-900 dark:text-white mb-1 tracking-tight">
                {CURRENCY_SYMBOLS[item.currency_code || item.currencyCode || 'EUR'] || ''}
                {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              {item.category?.name && (
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  {translateCategoryName(item.category.name)}
                </div>
              )}
              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 dark:text-gray-900 px-4 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 min-h-[48px]"
                  onClick={() => handleEdit(item)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  {t('transactions.edit')}
                </button>
                <button
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 min-h-[48px]"
                  onClick={() => onDelete(item.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  {t('transactions.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal drawer onClose={() => { setShowModal(false); setEditTx(null); }}>
          <TransactionForm
            initial={editTx}
            onSubmit={async data => {
              if (editTx) {
                // Update only the transaction instance, not the recurring template
                // Template should be modified from Recurring Transactions page
                onUpdate(editTx.id, data);
                setShowModal(false);
                setEditTx(null);
              } else if (data.isRecurring) {
                // Create recurring transaction
                try {
                  await addRecurringTransaction(data);
                  addToast(t('recurring.created'), 'success');
                  // Reload to refresh the list
                  if (onReload) {
                    await onReload();
                  }
                  setShowModal(false);
                  setEditTx(null);
                } catch (error) {
                  console.error('Error creating recurring transaction:', error);
                  addToast(t('recurring.createError'), 'error');
                }
              } else if (onAdd) {
                onAdd(data);
                setShowModal(false);
                setEditTx(null);
              }
            }}
            onCancel={() => { setShowModal(false); setEditTx(null); }}
            onCategoryAdded={reloadCategories}
            allowRecurring={!editTx}
          />
        </Modal>
      )}
    </Card>
  );
}
