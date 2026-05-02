import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';
import Button from '../../UI/Button';
import { translateCategoryName, getCategoryIcon } from '../../../utils/categoryTranslation';
import { CategoryIconSvg } from '../../UI/CategoryIconSvg';
import CustomSelect from '../../UI/CustomSelect';

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
      onChange([...expenses, { id: crypto.randomUUID(), amount: '', categoryId: '' }]);
    }
  }

  function removeExpense(index) {
    onChange(expenses.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display font-semibold tracking-tight text-2xl text-ink-primary dark:text-ink-dark-primary">
          {t('onboarding.expenses.title')}
        </h2>
        <p className="text-ink-muted dark:text-ink-dark-muted mt-2">
          {t('onboarding.expenses.subtitle')}
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {expenses.map((expense, index) => (
          <div key={expense.id} className="flex items-start gap-3">
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
                <label className="block text-sm font-medium text-ink-primary dark:text-ink-dark-primary mb-1.5">
                  {t('onboarding.expenses.categoryLabel')}
                </label>
                <CustomSelect
                 className="!w-full"
                  value={expense.categoryId}
                  onChange={(val) => updateExpense(index, 'categoryId', val)}
                  placeholder={t('onboarding.expenses.selectCategory')}
                  ariaLabel={t('onboarding.expenses.categoryLabel')}
                  options={categories.map((cat) => {
                    const iconKey = getCategoryIcon(cat);
                    return {
                      value: cat.id,
                      label: translateCategoryName(cat.name),
                      leading: (
                        <span className="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
                          <CategoryIconSvg iconKey={iconKey || 'Shopping'} className="w-3.5 h-3.5" />
                        </span>
                      ),
                    };
                  })}
                />
              </div>
            </div>
            {expenses.length > 1 && (
              <button
                type="button"
                onClick={() => removeExpense(index)}
                className="mt-7 p-2 text-ink-muted dark:text-ink-dark-muted hover:opacity-80 transition-colors"
                style={{ '--hover-color': '#e05c6b' }}
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
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('onboarding.expenses.addAnother')}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
