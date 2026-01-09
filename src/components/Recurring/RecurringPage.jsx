import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import Modal from '../UI/Modal';
import { fetchRecurringTransactions, deleteRecurringTransaction, pauseRecurringTransaction, resumeRecurringTransaction } from '../../utils/api';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { useToast } from '../../context/ToastContext';
import RecurringForm from './RecurringForm';

export default function RecurringPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [recurrings, setRecurrings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRecurring, setEditRecurring] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadRecurrings();
  }, []);

  async function loadRecurrings() {
    try {
      const data = await fetchRecurringTransactions();
      setRecurrings(data);
    } catch (error) {
      console.error('Error loading recurring transactions:', error);
      addToast(t('recurring.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('recurring.deleteConfirm'))) return;
    
    try {
      await deleteRecurringTransaction(id);
      addToast(t('recurring.deleted'), 'success');
      loadRecurrings();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      addToast(t('recurring.deleteError'), 'error');
    }
  }

  async function handleToggleActive(recurring) {
    try {
      if (recurring.is_active) {
        await pauseRecurringTransaction(recurring.id);
        addToast(t('recurring.paused'), 'success');
      } else {
        await resumeRecurringTransaction(recurring.id);
        addToast(t('recurring.resumed'), 'success');
      }
      loadRecurrings();
    } catch (error) {
      console.error('Error toggling recurring transaction:', error);
      addToast(t('recurring.toggleError'), 'error');
    }
  }

  function handleEdit(recurring) {
    setEditRecurring(recurring);
    setShowModal(true);
  }

  const currencySymbols = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    ALL: 'L',
    CHF: 'CHF',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$'
  };

  const getFrequencyText = (frequency, intervalCount) => {
    const count = intervalCount || 1;
    if (count === 1) {
      return t(`recurring.${frequency}`);
    }
    return t('recurring.every') + ' ' + count + ' ' + t(`recurring.${frequency}Unit`, { count });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Card className="mt-4 sm:mt-6">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-t-2xl p-4 sm:p-6 mb-4 shadow-md border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
          {t('recurring.manageTitle')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {t('recurring.manageDescription')}
        </p>
      </div>

      {recurrings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-gray-700 dark:text-gray-300 text-lg sm:text-xl font-bold mb-2">
            {t('recurring.noRecurring')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base max-w-sm">
            {t('recurring.noRecurringDesc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {recurrings.map(recurring => (
            <div
              key={recurring.id}
              className={`bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg p-5 sm:p-6 border transition-all ${
                recurring.is_active 
                  ? 'border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xl' 
                  : 'border-gray-300 dark:border-gray-600 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg sm:text-xl text-gray-800 dark:text-white">
                      {recurring.title}
                    </h3>
                    {!recurring.is_active && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {t('recurring.paused')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {getFrequencyText(recurring.frequency, recurring.interval_count)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {translateCategoryName(recurring.category?.name)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-2xl ${
                    recurring.type === 'income' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {currencySymbols[recurring.currency_code || 'EUR']}
                    {Number(recurring.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className={`text-xs font-bold uppercase ${
                    recurring.type === 'income' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {recurring.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('recurring.startDate')}</div>
                  <div className="font-semibold text-gray-800 dark:text-white">{recurring.start_date}</div>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('recurring.nextRun')}</div>
                  <div className="font-semibold text-gray-800 dark:text-white">
                    {new Date(recurring.next_run_at).toISOString().split('T')[0]}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('recurring.created')}</div>
                  <div className="font-semibold text-gray-800 dark:text-white">
                    {recurring.occurrences_created || 0}
                    {recurring.occurrences_limit && ` / ${recurring.occurrences_limit}`}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('recurring.endsLabel')}</div>
                  <div className="font-semibold text-gray-800 dark:text-white">
                    {recurring.end_date || (recurring.occurrences_limit ? t('recurring.afterCount') : t('recurring.endNever'))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleEdit(recurring)}
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 px-4 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t('transactions.edit')}
                </button>
                <button
                  onClick={() => handleToggleActive(recurring)}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
                    recurring.is_active
                      ? 'bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white'
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                  }`}
                >
                  {recurring.is_active ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('recurring.pause')}
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('recurring.resume')}
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(recurring.id)}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {t('transactions.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal drawer onClose={() => { setShowModal(false); setEditRecurring(null); }}>
          <RecurringForm
            initial={editRecurring}
            onSubmit={async () => {
              setShowModal(false);
              setEditRecurring(null);
              await loadRecurrings();
            }}
            onCancel={() => { setShowModal(false); setEditRecurring(null); }}
          />
        </Modal>
      )}
    </Card>
  );
}
