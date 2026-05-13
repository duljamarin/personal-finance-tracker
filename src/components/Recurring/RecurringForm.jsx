import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { updateRecurringTransaction } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { validateRecurringEndDate, getMinEndDateString } from '../../utils/recurringValidation';

const EXPENSE_COLOR = '#e8394d';
const EXPENSE_COLOR_DARK = '#e8394d';

const inputBaseClass =
  'w-full px-3 py-2.5 text-sm rounded-md border bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition';
const inputErrorClass = 'border-[color:var(--err)]';
const inputNormalClass = 'border-surface-hairline dark:border-surface-dark-hairline';

const selectClass =
  'appearance-none w-full pl-3 pr-9 py-2.5 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition';

export default function RecurringForm({ onSubmit, onCancel, initial }) {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [frequency, setFrequency] = useState(initial?.frequency || 'monthly');
  const [intervalCount, setIntervalCount] = useState(initial?.interval_count || 1);
  const [endType, setEndType] = useState(initial?.end_date ? 'date' : initial?.occurrences_limit ? 'count' : 'never');
  const [endDate, setEndDate] = useState(initial?.end_date || '');
  const [occurrencesLimit, setOccurrencesLimit] = useState(initial?.occurrences_limit || '');
  const [errors, setErrors] = useState({});

  function validate() {
    const newErrors = {};

    if (!intervalCount || isNaN(intervalCount) || Number(intervalCount) < 1) {
      newErrors.intervalCount = 'recurring.intervalError';
    }

    if (endType === 'date' && !endDate) {
      newErrors.endDate = 'recurring.endDateError';
    }

    if (endType === 'date' && endDate) {
      const startDate = initial?.start_date || new Date().toISOString().split('T')[0];
      const endDateError = validateRecurringEndDate(endDate, startDate, frequency, Number(intervalCount));
      if (endDateError) {
        newErrors.endDate = endDateError;
      }
    }

    if (endType === 'count' && (!occurrencesLimit || isNaN(occurrencesLimit) || Number(occurrencesLimit) < 2)) {
      newErrors.occurrencesLimit = 'recurring.occurrencesMinError';
    }

    return newErrors;
  }

  function handleEndDateChange(e) {
    const value = e.target.value;
    setEndDate(value);
    validateEndDate(value, frequency, intervalCount);
  }

  function handleIntervalCountChange(e) {
    const value = e.target.value;
    setIntervalCount(value);

    if (endType === 'date' && endDate) {
      validateEndDate(endDate, frequency, value);
    }

    setErrors((prev) => ({
      ...prev,
      intervalCount: value && !isNaN(value) && Number(value) >= 1 ? undefined : 'recurring.intervalError',
    }));
  }

  function handleFrequencyChange(e) {
    const value = e.target.value;
    setFrequency(value);

    if (endType === 'date' && endDate) {
      validateEndDate(endDate, value, intervalCount);
    }
  }

  function validateEndDate(selectedEndDate, freq, interval) {
    if (!selectedEndDate) return;

    const startDate = initial?.start_date || new Date().toISOString().split('T')[0];
    const endDateError = validateRecurringEndDate(selectedEndDate, startDate, freq, Number(interval));

    setErrors((prev) => ({
      ...prev,
      endDate: endDateError || undefined,
    }));
  }

  async function submit(e) {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    const formData = {
      frequency,
      intervalCount: Number(intervalCount),
      endDate: endType === 'date' ? endDate : null,
      occurrencesLimit: endType === 'count' ? Number(occurrencesLimit) : null,
    };

    try {
      await updateRecurringTransaction(initial.id, formData);
      addToast(t('recurring.updated'), 'success');
      onSubmit();
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      addToast(t('recurring.updateError'), 'error');
    }
  }

  const inputClass = (fieldError) =>
    `${inputBaseClass} ${fieldError ? inputErrorClass : inputNormalClass}`;

  function getMinEndDate() {
    const startDate = initial?.start_date || new Date().toISOString().split('T')[0];
    return getMinEndDateString(startDate, frequency, Number(intervalCount));
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 sm:gap-6 w-full sm:max-w-2xl sm:mx-auto h-full px-4 sm:px-0"
      style={{ '--err': EXPENSE_COLOR }}
    >
      <h2 className="font-semibold tracking-tight text-lg sm:text-2xl text-ink-primary dark:text-white mb-1 sm:mb-2 flex-shrink-0">
        {t('recurring.editTitle')}
      </h2>

      <div className="flex flex-col gap-3 sm:gap-6 overflow-y-auto flex-1 pr-2 sm:pr-3">
        {/* Transaction Info (read-only) */}
        <div className="bg-surface-subtle dark:bg-surface-dark-subtle border border-surface-hairline dark:border-surface-dark-hairline rounded-md p-3 sm:p-4">
          <h3 className="font-semibold tracking-tight text-sm sm:text-base text-ink-primary dark:text-white mb-1 sm:mb-2">
            {initial?.title}
          </h3>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-ink-muted dark:text-white">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              {initial?.type === 'income' ? (
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-brand-600 dark:text-brand-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: EXPENSE_COLOR }}
                >
                  <path d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 5.527m0 0 .776-2.898m-.776 2.898-2.898-.776" />
                </svg>
              )}
              <span
                style={
                  initial?.type === 'expense'
                    ? { color: EXPENSE_COLOR }
                    : undefined
                }
                className={initial?.type === 'income' ? 'text-brand-600 dark:text-brand-400' : ''}
              >
                €{Number(initial?.amount).toFixed(2)}
              </span>
            </span>
            <span className="text-ink-muted dark:text-white">·</span>
            <span>{t('recurring.readOnlyNote')}</span>
          </div>
        </div>

        {/* Frequency & Interval */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="flex flex-col gap-1 sm:gap-2">
            <label className="eyebrow">
              {t('recurring.frequency')}
            </label>
            <div className="relative">
              <select
                value={frequency}
                onChange={handleFrequencyChange}
                className={selectClass}
              >
                <option value="daily">{t('recurring.daily')}</option>
                <option value="weekly">{t('recurring.weekly')}</option>
                <option value="monthly">{t('recurring.monthly')}</option>
                <option value="yearly">{t('recurring.yearly')}</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1 sm:gap-2">
            <label className="eyebrow">
              {t('recurring.every')}
            </label>
            <div className="flex items-center gap-1 sm:gap-2">
              <Input
                type="number"
                min="1"
                value={intervalCount}
                onChange={handleIntervalCountChange}
                className={`${inputClass(errors.intervalCount)} w-16 sm:w-20`}
              />
              <span className="text-xs sm:text-sm text-ink-muted dark:text-white">
                {t(`recurring.${frequency}Unit`, { count: Number(intervalCount) || 1 })}
              </span>
            </div>
            {errors.intervalCount && (
              <span className="text-xs font-medium" style={{ color: EXPENSE_COLOR }}>
                {t(errors.intervalCount)}
              </span>
            )}
          </div>
        </div>

        {/* End Condition */}
        <div className="flex flex-col gap-1 sm:gap-2">
          <label className="eyebrow">
            {t('recurring.ends')}
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {['never', 'date', 'count'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setEndType(option)}
                className={`px-3 py-1.5 sm:px-3 sm:py-2 text-xs rounded-md font-medium border transition-colors ${
                  endType === option
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white border-surface-hairline dark:border-surface-dark-hairline hover:border-brand-500/40'
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
            <label className="eyebrow">
              {t('recurring.endDate')}
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              min={getMinEndDate()}
              className={`${inputClass(errors.endDate)} [color-scheme:light] dark:[color-scheme:dark]`}
            />
            {errors.endDate && (
              <span className="text-xs font-medium" style={{ color: EXPENSE_COLOR }}>
                {t(errors.endDate)}
              </span>
            )}
          </div>
        )}

        {/* Occurrences Count Input */}
        {endType === 'count' && (
          <div className="flex flex-col gap-1 sm:gap-2">
            <label className="eyebrow">
              {t('recurring.occurrences')}
            </label>
            <Input
              type="number"
              min="1"
              placeholder="10"
              value={occurrencesLimit}
              onChange={(e) => setOccurrencesLimit(e.target.value)}
              className={inputClass(errors.occurrencesLimit)}
            />
            {errors.occurrencesLimit && (
              <span className="text-xs font-medium" style={{ color: EXPENSE_COLOR }}>
                {t(errors.occurrencesLimit)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-surface-hairline dark:border-surface-dark-hairline flex-col sm:flex-row flex-shrink-0 mt-auto">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onCancel}
        >
          {t('forms.cancel')}
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-md"
        >
          {t('recurring.saveChanges')}
        </Button>
      </div>
    </form>
  );
}
