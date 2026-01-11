import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { updateRecurringTransaction } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const inputBaseClass = 'border py-2 px-2 sm:p-3 text-xs sm:text-base rounded-xl sm:w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition'
const inputErrorClass = 'border-red-500 focus:ring-red-500'
const inputNormalClass = 'border-gray-300 dark:border-gray-600'

export default function RecurringForm({ onSubmit, onCancel, initial }) {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [frequency, setFrequency] = useState(initial?.frequency || 'monthly')
  const [intervalCount, setIntervalCount] = useState(initial?.interval_count || 1)
  const [endType, setEndType] = useState(initial?.end_date ? 'date' : initial?.occurrences_limit ? 'count' : 'never')
  const [endDate, setEndDate] = useState(initial?.end_date || '')
  const [occurrencesLimit, setOccurrencesLimit] = useState(initial?.occurrences_limit || '')
  const [errors, setErrors] = useState({})

  function validate() {
    const newErrors = {}
    
    if (!intervalCount || isNaN(intervalCount) || Number(intervalCount) < 1) {
      newErrors.intervalCount = 'recurring.intervalError'
    }
    if (endType === 'date' && !endDate) {
      newErrors.endDate = 'recurring.endDateError'
    }
    if (endType === 'count' && (!occurrencesLimit || isNaN(occurrencesLimit) || Number(occurrencesLimit) < 1)) {
      newErrors.occurrencesLimit = 'recurring.occurrencesError'
    }
    
    return newErrors
  }

  async function submit(e) {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) return

    const formData = {
      frequency,
      intervalCount: Number(intervalCount),
      endDate: endType === 'date' ? endDate : null,
      occurrencesLimit: endType === 'count' ? Number(occurrencesLimit) : null
    }

    try {
      await updateRecurringTransaction(initial.id, formData)
      addToast(t('recurring.updated'), 'success')
      onSubmit()
    } catch (error) {
      console.error('Error updating recurring transaction:', error)
      addToast(t('recurring.updateError'), 'error')
    }
  }

  const getInputClassName = (fieldError) =>
    `${inputBaseClass} ${fieldError ? inputErrorClass : inputNormalClass}`

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:gap-6 w-full sm:max-w-2xl sm:mx-auto h-full">
      <h2 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white mb-1 sm:mb-2 flex-shrink-0">
        {t('recurring.editTitle')}
      </h2>

      <div className="flex flex-col gap-3 sm:gap-6 overflow-y-auto flex-1 pr-2 sm:pr-3">
        {/* Transaction Info (read-only) */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-2 sm:p-4">
          <h3 className="font-bold text-sm sm:text-base text-gray-800 dark:text-white mb-1 sm:mb-2">{initial?.title}</h3>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">
              {initial?.type === 'income' ? '💰' : '💸'} 
              €{Number(initial?.amount).toFixed(2)}
            </span>
            <span>•</span>
            <span>{t('recurring.readOnlyNote')}</span>
          </div>
        </div>

        {/* Frequency & Interval */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="flex flex-col gap-1 sm:gap-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t('recurring.frequency')}
            </label>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value)}
              className={inputBaseClass + ' ' + inputNormalClass}
            >
              <option value="daily">{t('recurring.daily')}</option>
              <option value="weekly">{t('recurring.weekly')}</option>
              <option value="monthly">{t('recurring.monthly')}</option>
              <option value="yearly">{t('recurring.yearly')}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 sm:gap-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t('recurring.every')}
            </label>
            <div className="flex items-center gap-1 sm:gap-2">
              <Input
                type="number"
                min="1"
                value={intervalCount}
                onChange={e => setIntervalCount(e.target.value)}
                className={`${getInputClassName(errors.intervalCount)} w-16 sm:w-20`}
              />
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {t(`recurring.${frequency}Unit`, { count: Number(intervalCount) || 1 })}
              </span>
            </div>
            {errors.intervalCount && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.intervalCount)}</span>
            )}
          </div>
        </div>
        
        {/* End Condition */}
        <div className="flex flex-col gap-1 sm:gap-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {t('recurring.ends')}
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {['never', 'date', 'count'].map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setEndType(option)}
                className={`px-2 py-1.5 sm:px-3 sm:py-2 text-xs rounded-lg font-medium border transition-all ${
                  endType === option
                    ? 'bg-purple-600 text-white border-purple-700'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400'
                }`}
              >
                {t(`recurring.end${option.charAt(0).toUpperCase() + option.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>
        
        {/* End Date Input */}
        {endType === 'date' && (
          <div className="flex flex-col gap-1 sm:gap-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t('recurring.endDate')}
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={`${getInputClassName(errors.endDate)} [color-scheme:light] dark:[color-scheme:dark]`}
            />
            {errors.endDate && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.endDate)}</span>
            )}
          </div>
        )}
        
        {/* Occurrences Count Input */}
        {endType === 'count' && (
          <div className="flex flex-col gap-1 sm:gap-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t('recurring.occurrences')}
            </label>
            <Input
              type="number"
              min="1"
              placeholder="10"
              value={occurrencesLimit}
              onChange={e => setOccurrencesLimit(e.target.value)}
              className={getInputClassName(errors.occurrencesLimit)}
            />
            {errors.occurrencesLimit && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">{t(errors.occurrencesLimit)}</span>
            )}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 flex-col sm:flex-row flex-shrink-0 mt-auto">
        <Button
          type="button"
          className="flex-1 border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold py-2 sm:py-3 rounded-xl transition-all text-sm sm:text-base"
          onClick={onCancel}
        >
          {t('forms.cancel')}
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-2 sm:py-3 rounded-xl shadow-lg transition-all text-sm sm:text-base"
        >
          {t('recurring.saveChanges')}
        </Button>
      </div>
    </form>
  )
}
