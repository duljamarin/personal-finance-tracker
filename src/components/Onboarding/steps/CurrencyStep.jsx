import { useTranslation } from 'react-i18next';
import Input from '../../UI/Input';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'ALL', 'CHF', 'JPY', 'CAD', 'AUD'];
const FLAGS = { EUR: '\u{1F1EA}\u{1F1FA}', USD: '\u{1F1FA}\u{1F1F8}', GBP: '\u{1F1EC}\u{1F1E7}', ALL: '\u{1F1E6}\u{1F1F1}', CHF: '\u{1F1E8}\u{1F1ED}', JPY: '\u{1F1EF}\u{1F1F5}', CAD: '\u{1F1E8}\u{1F1E6}', AUD: '\u{1F1E6}\u{1F1FA}' };

const selectClass =
  'appearance-none w-full px-3 py-2.5 pr-10 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-ink-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition';

export default function CurrencyStep({ currency, exchangeRate, onCurrencyChange, onExchangeRateChange }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display font-semibold tracking-tight text-2xl text-ink-primary dark:text-ink-dark-primary">
          {t('onboarding.currency.title')}
        </h2>
        <p className="text-ink-muted dark:text-ink-dark-muted mt-2">
          {t('onboarding.currency.subtitle')}
        </p>
      </div>

      <div className="max-w-xs mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-primary dark:text-ink-dark-primary mb-1.5">
            {t('onboarding.currency.label')}
          </label>
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className={selectClass}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {t(`currency.${code}`)} {FLAGS[code]}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted dark:text-ink-dark-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
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
