import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';
import Button from '../../UI/Button';
import { translateCategoryName, getCategoryIcon } from '../../../utils/categoryTranslation';
import { CategoryIconSvg } from '../../UI/CategoryIconSvg';
import CustomSelect from '../../UI/CustomSelect';
import { CURRENCY_SYMBOLS } from '../../../utils/constants';

const MAX_EXPENSES = 6;

// Preset bill chips. `names` lists the exact default category names this chip
// should map to (first match wins); `match` is a word-boundaried fallback for
// custom categories. Order matters — exact names are tried before the regex,
// so e.g. "Healthcare" never gets grabbed by a transport keyword.
const BILL_PRESETS = [
  { key: 'rent', names: ['Housing & Rent'], match: /\b(rent|housing|qira|banes|apartment)\b/i },
  { key: 'food', names: ['Food & Dining', 'Groceries'], match: /\b(food|groceries|ushqim|market)\b/i },
  { key: 'transport', names: ['Transportation'], match: /\b(transport|transportation|fuel|udhetim|makina)\b/i },
  { key: 'utilities', names: ['Utilities'], match: /\b(utilities|electric|water|energji|fatura)\b/i },
  { key: 'subscriptions', names: ['Subscriptions'], match: /\b(subscriptions|abonim|netflix|spotify)\b/i },
];

export default function ExpensesStep({ expenses, onChange, categories, currency }) {
  const { t } = useTranslation();
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const placeholder = currency === 'ALL' ? '5000' : currency === 'JPY' ? '5000' : '50';

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

  // Resolve a preset to a category id: exact default-name match first, then a
  // word-boundaried keyword fallback for custom categories.
  function resolvePresetCategory(preset) {
    const byName = categories.find((c) =>
      preset.names.some((n) => n.toLowerCase() === c.name.toLowerCase())
    );
    if (byName) return byName.id;
    const byKeyword = categories.find((c) => preset.match.test(c.name));
    return byKeyword?.id || '';
  }

  // A preset is "selected" once its category appears in any bill row.
  function isPresetSelected(preset) {
    const catId = resolvePresetCategory(preset);
    return !!catId && expenses.some((e) => e.categoryId === catId);
  }

  // Add a bill row pre-filled with the best-matching category for a preset.
  function addPreset(preset) {
    if (expenses.length >= MAX_EXPENSES) return;
    const categoryId = resolvePresetCategory(preset);
    if (categoryId && expenses.some((e) => e.categoryId === categoryId)) return; // already added
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

      {/* Preset quick-pick chips */}
      <div className="max-w-md mx-auto flex flex-wrap justify-center gap-2">
        {BILL_PRESETS.map((preset) => {
          const selected = isPresetSelected(preset);
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => addPreset(preset)}
              disabled={!selected && expenses.length >= MAX_EXPENSES}
              aria-pressed={selected}
              className={
                'px-3 py-1.5 text-sm rounded-full border inline-flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ' +
                (selected
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 font-medium'
                  : 'border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400')
              }
            >
              {selected ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span aria-hidden="true">+</span>
              )}
              {t(`onboarding.expenses.presets.${preset.key}`)}
            </button>
          );
        })}
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {expenses.map((expense, index) => (
          <div key={expense.id} className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
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
