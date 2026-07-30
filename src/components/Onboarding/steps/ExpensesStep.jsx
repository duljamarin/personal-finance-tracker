import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';
import Button from '../../UI/Button';
import { translateCategoryName, getCategoryIcon } from '../../../utils/categoryTranslation';
import { CategoryIconSvg } from '../../UI/CategoryIconSvg';
import CustomSelect from '../../UI/CustomSelect';
import { CURRENCY_SYMBOLS } from '../../../utils/constants';

const MAX_EXPENSES = 8;

// How many chips to show before "Show more". The pinned names below fill this
// row first; everything else is revealed on demand.
const COLLAPSED_CHIP_COUNT = 5;

// The bills people almost always have, pinned to the front of the chip row in
// this order. These are canonical English category names (categories are always
// stored in English and localized for display — see translateCategoryName).
// Anything the user actually has that isn't listed here still appears as a chip,
// just after these and behind "Show more".
const PINNED_CATEGORY_NAMES = [
  'Housing & Rent',
  'Food & Dining',
  'Transportation',
  'Utilities',
  'Subscriptions',
];

// Income-side categories make no sense as a monthly *bill* chip.
const EXCLUDED_FROM_CHIPS = new Set(['Salary', 'Freelance', 'Investments']);

export default function ExpensesStep({ expenses, onChange, categories, currency }) {
  const { t } = useTranslation();
  const [showAllChips, setShowAllChips] = useState(false);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const placeholder = currency === 'ALL' ? '5000' : currency === 'JPY' ? '5000' : '50';

  // Chips are derived from the user's REAL categories, so picking one always
  // yields a concrete category_id — no name/keyword guessing, and custom
  // categories are offered too. Pinned common bills first, then the rest
  // alphabetically by their translated (displayed) label.
  const chips = useMemo(() => {
    const pinnedIndex = new Map(PINNED_CATEGORY_NAMES.map((n, i) => [n.toLowerCase(), i]));
    return categories
      .filter((c) => !EXCLUDED_FROM_CHIPS.has(c.name))
      .map((c) => ({
        id: c.id,
        category: c,
        label: translateCategoryName(c.name),
        rank: pinnedIndex.has(c.name.toLowerCase())
          ? pinnedIndex.get(c.name.toLowerCase())
          : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.label.localeCompare(b.label)));
  }, [categories]);

  const visibleChips = showAllChips ? chips : chips.slice(0, COLLAPSED_CHIP_COUNT);
  const hiddenChipCount = chips.length - visibleChips.length;

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

  // A chip is "selected" once its category occupies a bill row.
  function isChipSelected(categoryId) {
    return expenses.some((e) => e.categoryId === categoryId);
  }

  // Toggle a chip: add a bill row for the category, or remove the row it owns.
  // Clicking a selected chip only drops the row when the user hasn't typed an
  // amount into it yet — otherwise a stray click would silently discard input.
  function toggleChip(categoryId) {
    const existing = expenses.findIndex((e) => e.categoryId === categoryId);
    if (existing >= 0) {
      if (expenses[existing].amount) return; // has data; keep it (use the row's X)
      // Never leave zero rows behind — blank the row instead of removing the last one.
      if (expenses.length === 1) {
        onChange([{ ...expenses[0], categoryId: '' }]);
      } else {
        removeExpense(existing);
      }
      return;
    }
    if (expenses.length >= MAX_EXPENSES) return;
    // Reuse an untouched row if one is sitting empty, so clicking chips doesn't
    // pile up blank rows below the list.
    const firstEmpty = expenses.findIndex((e) => !e.amount && !e.categoryId);
    if (firstEmpty >= 0) {
      updateExpense(firstEmpty, 'categoryId', categoryId);
    } else {
      onChange([...expenses, { id: crypto.randomUUID(), amount: '', categoryId }]);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-semibold tracking-tight text-2xl text-ink-primary dark:text-white">
          {t('onboarding.expenses.title')}
        </h2>
        <p className="text-ink-muted dark:text-white mt-2">
          {t('onboarding.expenses.subtitle')}
        </p>
      </div>

      {/* Category quick-pick chips — driven by the user's own categories */}
      <div className="max-w-md mx-auto">
        <div className="flex flex-wrap justify-center gap-2">
          {visibleChips.map((chip) => {
            const selected = isChipSelected(chip.id);
            const iconKey = getCategoryIcon(chip.category);
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleChip(chip.id)}
                disabled={!selected && expenses.length >= MAX_EXPENSES}
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
                {chip.label}
              </button>
            );
          })}
        </div>

        {chips.length > COLLAPSED_CHIP_COUNT && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setShowAllChips((v) => !v)}
              className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              {showAllChips
                ? t('onboarding.expenses.showFewerCategories')
                : t('onboarding.expenses.showMoreCategories', { count: hiddenChipCount })}
            </button>
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {expenses.map((expense, index) => (
          <div key={expense.id} className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-sm font-medium text-ink-primary dark:text-white mb-1.5">
                  {t('onboarding.expenses.categoryLabel')}
                </label>
                <CustomSelect
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
                        <span className="w-6 h-6 rounded-md bg-surface-subtle dark:bg-surface-dark-subtle flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
                          <CategoryIconSvg iconKey={iconKey || 'Shopping'} className="w-3.5 h-3.5" />
                        </span>
                      ),
                    };
                  })}
                />
              </div>
              <Input
                label={t('onboarding.expenses.amountLabel')}
                type="number"
                min="0"
                step="0.01"
                placeholder={placeholder}
                value={expense.amount}
                onChange={(e) => updateExpense(index, 'amount', e.target.value)}
                leadingIcon={<span className="text-sm font-medium text-ink-muted dark:text-white">{symbol}</span>}
              />
            </div>
            {expenses.length > 1 && (
              <button
                type="button"
                onClick={() => removeExpense(index)}
                className="mt-7 p-2 text-ink-muted dark:text-white hover:text-expense transition-colors"
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
