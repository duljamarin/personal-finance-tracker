import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';

export default function IncomeStep({ monthlyIncome, onChange, currency }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('onboarding.income.title')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
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
