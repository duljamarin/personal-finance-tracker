import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';
import { getInputClassName } from '../../../utils/classNames';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'ALL', 'CHF', 'JPY', 'CAD', 'AUD'];
const FLAGS = { EUR: '\u{1F1EA}\u{1F1FA}', USD: '\u{1F1FA}\u{1F1F8}', GBP: '\u{1F1EC}\u{1F1E7}', ALL: '\u{1F1E6}\u{1F1F1}', CHF: '\u{1F1E8}\u{1F1ED}', JPY: '\u{1F1EF}\u{1F1F5}', CAD: '\u{1F1E8}\u{1F1E6}', AUD: '\u{1F1E6}\u{1F1FA}' };

export default function CurrencyStep({ currency, exchangeRate, onCurrencyChange, onExchangeRateChange }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('onboarding.currency.title')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          {t('onboarding.currency.subtitle')}
        </p>
      </div>

      <div className="max-w-xs mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('onboarding.currency.label')}
          </label>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className={getInputClassName(false)}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {t(`currency.${code}`)} {FLAGS[code]}
              </option>
            ))}
          </select>
        </div>

        {currency !== 'EUR' && (
          <Input
            label={t('onboarding.currency.exchangeRateLabel', { currency, base: 'EUR' })}
            type="number"
            min="0.000001"
            step="0.000001"
            placeholder={t('onboarding.currency.exchangeRatePlaceholder')}
            value={exchangeRate}
            onChange={(e) => onExchangeRateChange(e.target.value)}
            helperText={t('onboarding.currency.exchangeRateHint', { amount: 1, currency, result: (1 * (Number(exchangeRate) || 0)).toFixed(2) })}
          />
        )}
      </div>
    </div>
  );
}
