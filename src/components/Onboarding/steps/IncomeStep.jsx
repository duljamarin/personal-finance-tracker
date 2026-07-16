import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';
import { CURRENCY_SYMBOLS } from '../../../utils/constants';

// Monthly income + optional payday. Both feed the reveal (projection +
// safe-to-spend). Fully skippable — the wizard degrades gracefully.
export default function IncomeStep({ income, payday, onIncomeChange, onPaydayChange, currency }) {
  const { t } = useTranslation();
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const placeholder = currency === 'ALL' || currency === 'JPY' ? '150000' : '3000';

  // Payday is a plain 1-31 number. A native numeric input beats a 31-item
  // dropdown on mobile: it opens the numeric keypad and has no scroll-trap
  // (the old CustomSelect list capped at max-h-64 clipped ~day 28 on small
  // screens, so 29-31 were unreachable). Clamp on change so out-of-range
  // typing can't leak through.
  function handlePaydayChange(e) {
    const raw = e.target.value;
    if (raw === '') {
      onPaydayChange('');
      return;
    }
    const n = Math.max(1, Math.min(31, Math.floor(Number(raw))));
    onPaydayChange(Number.isNaN(n) ? '' : String(n));
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-semibold tracking-tight text-2xl text-ink-primary dark:text-white">
          {t('onboarding.income.title')}
        </h2>
        <p className="text-ink-muted dark:text-white mt-2">
          {t('onboarding.income.subtitle')}
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <Input
          label={t('onboarding.income.label')}
          type="number"
          min="0"
          step="0.01"
          placeholder={placeholder}
          value={income}
          onChange={(e) => onIncomeChange(e.target.value)}
          leadingIcon={<span className="text-sm font-medium text-ink-muted dark:text-white">{symbol}</span>}
        />

        <div>
          <label className="block text-sm font-medium text-ink-primary dark:text-white mb-1.5">
            {t('onboarding.income.paydayLabel')}
            <span className="text-ink-muted dark:text-white/60 font-normal ml-1">
              {t('onboarding.income.optional')}
            </span>
          </label>
          <Input
            type="number"
            min="1"
            max="31"
            step="1"
            inputMode="numeric"
            placeholder={t('onboarding.income.paydayPlaceholder')}
            value={payday ? String(payday) : ''}
            onChange={handlePaydayChange}
            aria-label={t('onboarding.income.paydayLabel')}
          />
        </div>
      </div>
    </div>
  );
}
