import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';
import { translateCategoryName, getCategoryIcon } from '../../../utils/categoryTranslation';
import { CategoryIconSvg } from '../../UI/CategoryIconSvg';
import CustomSelect from '../../UI/CustomSelect';
import { CURRENCY_SYMBOLS } from '../../../utils/constants';

// Same reasoning as goals: capped below the plan limit so onboarding stays short.
const MAX_BUDGETS = 4;

// Categories that make no sense as a spending cap.
const EXCLUDED = new Set(['Salary', 'Freelance', 'Investments']);

// Round a suggested cap up to a tidy number so it never lands below the bill it
// was derived from (a budget seeded at exactly the bill amount reads 100% spent
// immediately, which looks alarming on a fresh dashboard).
function suggestFromBill(amount) {
  const n = Number(amount) || 0;
  if (n <= 0) return '';
  const padded = n * 1.15;
  const magnitude = padded >= 10000 ? 1000 : padded >= 1000 ? 100 : padded >= 100 ? 50 : 10;
  return String(Math.ceil(padded / magnitude) * magnitude);
}

// Optional step: 1-2 monthly category budgets. Suggestions are derived from the
// bills entered on the previous step, so the common path is one click + confirm.
export default function BudgetsStep({ budgets, onChange, categories, currency, expenses }) {
  const { t } = useTranslation();
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const placeholder = currency === 'ALL' || currency === 'JPY' ? '50000' : '300';

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Suggest the categories the user already told us about (their bills), since a
  // budget is only meaningful where money actually goes.
  const suggestions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const exp of expenses || []) {
      // Only bills with a real amount: a category with no amount gives us
      // nothing to suggest a cap from.
      if (!(Number(exp.amount) > 0)) continue;
      const cat = exp.categoryId && categoryById.get(exp.categoryId);
      if (!cat || seen.has(cat.id) || EXCLUDED.has(cat.name)) continue;
      seen.add(cat.id);
      out.push({ category: cat, suggested: suggestFromBill(exp.amount) });
    }
    return out;
  }, [expenses, categoryById]);

  const availableOptions = useMemo(
    () =>
      categories
        .filter((c) => !EXCLUDED.has(c.name))
        .map((cat) => {
          const iconKey = getCategoryIcon(cat);
          return {
            value: cat.id,
            label: translateCategoryName(cat.name),
            leading: (
              <span className="w-6 h-6 rounded-md bg-surface-subtle dark:bg-surface-dark-subtle flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
                <CategoryIconSvg iconKey={iconKey || 'Shopping'} className="w-3.5 h-3.5" />
              </span>
            ),
          };
        }),
    [categories]
  );

  function updateBudget(index, field, value) {
    onChange(budgets.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }

  function removeBudget(index) {
    onChange(budgets.filter((_, i) => i !== index));
  }

  function toggleSuggestion(suggestion) {
    const existing = budgets.findIndex((b) => b.categoryId === suggestion.category.id);
    if (existing >= 0) {
      removeBudget(existing);
      return;
    }
    if (budgets.length >= MAX_BUDGETS) return;
    onChange([
      ...budgets,
      {
        id: crypto.randomUUID(),
        categoryId: suggestion.category.id,
        amount: suggestion.suggested,
      },
    ]);
  }

  const atCap = budgets.length >= MAX_BUDGETS;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-semibold tracking-tight text-2xl text-ink-primary dark:text-white">
          {t('onboarding.budgets.title')}
        </h2>
        <p className="text-ink-muted dark:text-white mt-2">
          {t('onboarding.budgets.subtitle')}
        </p>
      </div>

      {suggestions.length > 0 && (
        <div className="max-w-md mx-auto flex flex-wrap justify-center gap-2">
          {suggestions.map((suggestion) => {
            const selected = budgets.some((b) => b.categoryId === suggestion.category.id);
            const iconKey = getCategoryIcon(suggestion.category);
            return (
              <button
                key={suggestion.category.id}
                type="button"
                onClick={() => toggleSuggestion(suggestion)}
                disabled={!selected && atCap}
                aria-pressed={selected}
                className={
                  'px-3 py-1.5 text-sm rounded-full border inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ' +
                  (selected
                    ? 'border-brand-600 bg-brand-600 text-white font-medium'
                    : 'border-surface-outline dark:border-surface-dark-outline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400')
                }
              >
                {selected ? (
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : iconKey ? (
                  <CategoryIconSvg iconKey={iconKey} className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <span aria-hidden="true">+</span>
                )}
                {translateCategoryName(suggestion.category.name)}
              </button>
            );
          })}
        </div>
      )}

      <div className="max-w-md mx-auto space-y-4">
        {budgets.length === 0 && (
          <p className="text-center text-sm text-ink-muted dark:text-white">
            {suggestions.length > 0
              ? t('onboarding.budgets.empty')
              : t('onboarding.budgets.emptyNoBills')}
          </p>
        )}

        {budgets.map((budget, index) => {
          // Don't offer a category that another budget row already uses.
          const takenElsewhere = new Set(
            budgets.filter((_, i) => i !== index).map((b) => b.categoryId)
          );
          return (
            <div
              key={budget.id}
              className="flex items-start gap-3 border-l-2 border-l-brand-600 pl-4 py-1"
            >
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-ink-primary dark:text-white mb-1.5">
                    {t('onboarding.budgets.categoryLabel')}
                  </label>
                  <CustomSelect
                    value={budget.categoryId}
                    onChange={(val) => updateBudget(index, 'categoryId', val)}
                    placeholder={t('onboarding.budgets.selectCategory')}
                    ariaLabel={t('onboarding.budgets.categoryLabel')}
                    options={availableOptions.filter((o) => !takenElsewhere.has(o.value))}
                  />
                </div>
                <Input
                  label={t('onboarding.budgets.amountLabel')}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={placeholder}
                  value={budget.amount}
                  onChange={(e) => updateBudget(index, 'amount', e.target.value)}
                  leadingIcon={<span className="text-sm font-medium text-ink-muted dark:text-white">{symbol}</span>}
                />
              </div>
              <button
                type="button"
                onClick={() => removeBudget(index)}
                className="mt-7 p-2 text-ink-muted dark:text-white hover:text-expense transition-colors"
                aria-label={t('onboarding.budgets.remove')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}

        {!atCap && (
          <button
            type="button"
            onClick={() => {
              if (budgets.length >= MAX_BUDGETS) return;
              onChange([...budgets, { id: crypto.randomUUID(), categoryId: '', amount: '' }]);
            }}
            className="w-full text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline py-1"
          >
            {t('onboarding.budgets.addCustom')}
          </button>
        )}
      </div>
    </div>
  );
}

export { MAX_BUDGETS };
