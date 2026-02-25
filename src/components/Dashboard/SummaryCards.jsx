import { useTranslation } from 'react-i18next';
import { getValueColorClass } from '../../utils/classNames';

export default function SummaryCards({ totalIncome, totalExpense, net, hasMixedCurrencies }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-green-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">{t('dashboard.totalIncome')}</p>
          <p className="text-3xl sm:text-4xl font-extrabold text-green-600 dark:text-green-400 tracking-tight">&euro;{totalIncome.toFixed(2)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('currency.baseCurrency')}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-red-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">{t('dashboard.totalExpenses')}</p>
          <p className="text-3xl sm:text-4xl font-extrabold text-red-600 dark:text-red-400 tracking-tight">&euro;{totalExpense.toFixed(2)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('currency.baseCurrency')}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-blue-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">{t('dashboard.balance')}</p>
          <p className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${getValueColorClass(net)}`}>&euro;{net.toFixed(2)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('currency.baseCurrency')}</p>
        </div>
      </div>

      {hasMixedCurrencies && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t('currency.mixedCurrencies')}</span>
        </div>
      )}
    </>
  );
}
