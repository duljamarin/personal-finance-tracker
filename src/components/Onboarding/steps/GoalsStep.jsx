import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';
import Button from '../../UI/Button';
import { CURRENCY_SYMBOLS } from '../../../utils/constants';

// Capped below the plan limit on purpose: onboarding is for momentum, not a
// full setup. Users add the rest from /goals.
const MAX_GOALS = 4;

// Suggested starters. `key` is the i18n key for the label; `months` seeds a
// target date so the goal shows real progress pacing straight away, and
// `multiplier` scales the suggested amount off monthly income when we know it.
const GOAL_PRESETS = [
  { key: 'emergencyFund', months: 12, multiplier: 3 },
  { key: 'vacation', months: 8, multiplier: 1 },
  { key: 'newDevice', months: 6, multiplier: 0.5 },
  { key: 'debtFree', months: 12, multiplier: 1.5 },
  { key: 'home', months: 36, multiplier: 6 },
  { key: 'car', months: 24, multiplier: 4 },
];

// Round a suggested amount to something a human would actually type.
function roundSuggestion(value) {
  if (!value || value <= 0) return '';
  const magnitude = value >= 10000 ? 1000 : value >= 1000 ? 500 : 100;
  return String(Math.max(magnitude, Math.round(value / magnitude) * magnitude));
}

// Optional step: let the user commit to 1-2 savings goals during onboarding so
// the Goals page isn't empty on day one. Fully skippable.
export default function GoalsStep({ goals, onChange, currency, income }) {
  const { t } = useTranslation();
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const incomeNum = Number(income) || 0;
  const placeholder = currency === 'ALL' || currency === 'JPY' ? '150000' : '1000';

  function updateGoal(index, field, value) {
    onChange(goals.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  }

  function removeGoal(index) {
    onChange(goals.filter((_, i) => i !== index));
  }

  function isPresetSelected(preset) {
    return goals.some((g) => g.presetKey === preset.key);
  }

  // Toggle a suggested goal. Selecting fills in a sensible name, a suggested
  // amount derived from income (when known) and a target date, all editable.
  function togglePreset(preset) {
    const existing = goals.findIndex((g) => g.presetKey === preset.key);
    if (existing >= 0) {
      removeGoal(existing);
      return;
    }
    if (goals.length >= MAX_GOALS) return;
    const target = new Date();
    target.setMonth(target.getMonth() + preset.months);
    onChange([
      ...goals,
      {
        id: crypto.randomUUID(),
        presetKey: preset.key,
        name: t(`onboarding.goals.presets.${preset.key}`),
        amount: roundSuggestion(incomeNum * preset.multiplier),
        targetDate: target.toISOString().split('T')[0],
      },
    ]);
  }

  function addCustomGoal() {
    if (goals.length >= MAX_GOALS) return;
    const target = new Date();
    target.setMonth(target.getMonth() + 12);
    onChange([
      ...goals,
      {
        id: crypto.randomUUID(),
        presetKey: null,
        name: '',
        amount: '',
        targetDate: target.toISOString().split('T')[0],
      },
    ]);
  }

  const atCap = goals.length >= MAX_GOALS;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-semibold tracking-tight text-2xl text-ink-primary dark:text-white">
          {t('onboarding.goals.title')}
        </h2>
        <p className="text-ink-muted dark:text-white mt-2">
          {t('onboarding.goals.subtitle')}
        </p>
      </div>

      {/* Suggested goals */}
      <div className="max-w-md mx-auto flex flex-wrap justify-center gap-2">
        {GOAL_PRESETS.map((preset) => {
          const selected = isPresetSelected(preset);
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => togglePreset(preset)}
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
              ) : (
                <span aria-hidden="true">+</span>
              )}
              {t(`onboarding.goals.presets.${preset.key}`)}
            </button>
          );
        })}
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {goals.length === 0 && (
          <p className="text-center text-sm text-ink-muted dark:text-white">
            {t('onboarding.goals.empty')}
          </p>
        )}

        {goals.map((goal, index) => (
          <div
            key={goal.id}
            className="flex items-start gap-3 border-l-2 border-l-brand-600 pl-4 py-1"
          >
            <div className="flex-1 space-y-3">
              <Input
                label={t('onboarding.goals.nameLabel')}
                type="text"
                maxLength={60}
                placeholder={t('onboarding.goals.namePlaceholder')}
                value={goal.name}
                onChange={(e) => updateGoal(index, 'name', e.target.value)}
              />
              <Input
                label={t('onboarding.goals.amountLabel')}
                type="number"
                min="0"
                step="0.01"
                placeholder={placeholder}
                value={goal.amount}
                onChange={(e) => updateGoal(index, 'amount', e.target.value)}
                leadingIcon={<span className="text-sm font-medium text-ink-muted dark:text-white">{symbol}</span>}
              />
              <Input
                label={t('onboarding.goals.targetDateLabel')}
                type="date"
                value={goal.targetDate || ''}
                onChange={(e) => updateGoal(index, 'targetDate', e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => removeGoal(index)}
              className="mt-7 p-2 text-ink-muted dark:text-white hover:text-expense transition-colors"
              aria-label={t('onboarding.goals.remove')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {!atCap && (
          <Button variant="ghost" size="sm" onClick={addCustomGoal} className="w-full">
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('onboarding.goals.addCustom')}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}

export { MAX_GOALS };
