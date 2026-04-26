import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';

export default function IncomeStep({ monthlyIncome, onChange, currency }) {
  const { t } = useTranslation();

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
          label={`${t('onboarding.income.label')} (${currency})`}
          type="number"
          min="0"
          step="0.01"
          placeholder={t('onboarding.income.placeholder')}
          value={monthlyIncome}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
