import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';
import Button from '../../UI/Button';
import { translateCategoryName } from '../../../utils/categoryTranslation';
import { getInputClassName } from '../../../utils/classNames';

const MAX_EXPENSES = 3;

export default function ExpensesStep({ expenses, onChange, categories, currency }) {
  const { t } = useTranslation();

  function updateExpense(index, field, value) {
    const updated = expenses.map((exp, i) =>
      i === index ? { ...exp, [field]: value } : exp
    );
    onChange(updated);
  }

  function addExpense() {
    if (expenses.length < MAX_EXPENSES) {
      onChange([...expenses, { amount: '', categoryId: '' }]);
    }
  }

  function removeExpense(index) {
    onChange(expenses.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('onboarding.expenses.title')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          {t('onboarding.expenses.subtitle')}
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {expenses.map((expense, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <Input
                label={`${t('onboarding.expenses.amountLabel')} (${currency})`}
                type="number"
                min="0"
                step="0.01"
                placeholder={t('onboarding.expenses.amountPlaceholder')}
                value={expense.amount}
                onChange={(e) => updateExpense(index, 'amount', e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('onboarding.expenses.categoryLabel')}
                </label>
                <select
                  value={expense.categoryId}
                  onChange={(e) => updateExpense(index, 'categoryId', e.target.value)}
                  className={getInputClassName(false)}
                >
                  <option value="">{t('onboarding.expenses.selectCategory')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {translateCategoryName(cat.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {expenses.length > 1 && (
              <button
                type="button"
                onClick={() => removeExpense(index)}
                className="mt-7 p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                aria-label={t('onboarding.expenses.remove')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}

        {expenses.length < MAX_EXPENSES && (
          <Button variant="ghost" size="sm" onClick={addExpense} className="w-full">
            + {t('onboarding.expenses.addAnother')}
          </Button>
        )}
      </div>
    </div>
  );
}
