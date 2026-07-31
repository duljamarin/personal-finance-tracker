import { useTranslation } from 'react-i18next';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'ALL', 'CHF', 'JPY', 'CAD', 'AUD'];
const FLAGS = { EUR: '\u{1F1EA}\u{1F1FA}', USD: '\u{1F1FA}\u{1F1F8}', GBP: '\u{1F1EC}\u{1F1E7}', ALL: '\u{1F1E6}\u{1F1F1}', CHF: '\u{1F1E8}\u{1F1ED}', JPY: '\u{1F1EF}\u{1F1F5}', CAD: '\u{1F1E8}\u{1F1E6}', AUD: '\u{1F1E6}\u{1F1FA}' };

const selectClass =
  'appearance-none w-full px-3 py-2.5 pr-10 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 transition';

export default function CurrencyStep({ currency, onCurrencyChange }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-semibold tracking-tight text-2xl text-ink-primary dark:text-white">
          {t('onboarding.currency.title')}
        </h2>
        <p className="text-ink-muted dark:text-white mt-2">
          {t('onboarding.currency.subtitle')}
        </p>
      </div>

      <div className="max-w-xs mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-primary dark:text-white mb-1.5">
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
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted dark:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <p className="text-xs text-ink-muted dark:text-white text-center">
          {t('onboarding.currency.permanentHint')}
        </p>
      </div>
    </div>
  );
}
