import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';
import CustomSelect from '../../UI/CustomSelect';
import { CURRENCY_SYMBOLS } from '../../../utils/constants';

// Monthly income + optional payday. Both feed the reveal (projection +
// safe-to-spend). Fully skippable — the wizard degrades gracefully.
export default function IncomeStep({ income, payday, onIncomeChange, onPaydayChange, currency }) {
  const { t } = useTranslation();
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const placeholder = currency === 'ALL' || currency === 'JPY' ? '150000' : '3000';

  const dayOptions = Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

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
          <CustomSelect
            value={payday ? String(payday) : ''}
            onChange={(val) => onPaydayChange(val)}
            placeholder={t('onboarding.income.paydayPlaceholder')}
            ariaLabel={t('onboarding.income.paydayLabel')}
            options={dayOptions}
          />
        </div>
      </div>
    </div>
  );
}
