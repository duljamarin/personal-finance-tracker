import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';
import { CURRENCY_SYMBOLS } from '../../../utils/constants';

export default function IncomeStep({ monthlyIncome, onChange, currency }) {
  const { t } = useTranslation();
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const placeholder = currency === 'ALL' ? '80000' : currency === 'JPY' ? '300000' : '3000';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display font-semibold tracking-tight text-2xl text-ink-primary dark:text-ink-dark-primary">
          {t('onboarding.income.title')}
        </h2>
        <p className="text-ink-muted dark:text-ink-dark-muted mt-2">
          {t('onboarding.income.subtitle')}
        </p>
      </div>

      <div className="max-w-xs mx-auto">
        <Input
          label={t('onboarding.income.label')}
          type="number"
          min="0"
          step="0.01"
          placeholder={placeholder}
          value={monthlyIncome}
          onChange={(e) => onChange(e.target.value)}
          leadingIcon={<span className="text-sm font-medium text-ink-muted dark:text-ink-dark-muted">{symbol}</span>}
        />
      </div>
    </div>
  );
}
