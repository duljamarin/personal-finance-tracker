import { useTranslation } from 'react-i18next';
import CurrencyFlag from '../../UI/CurrencyFlag';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'ALL', 'CHF', 'JPY', 'CAD', 'AUD'];

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
              {/* Native <option> renders text only, so no flag markup here.
                  Emoji flags were showing as bare letters ("AL") on Windows,
                  which reads as a glitch; the ISO code is unambiguous. */}
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {t(`currency.${code}`)} ({code})
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
          {/* Flag lives outside the select — <option> cannot hold markup. */}
          <div className="flex items-center gap-2 mt-2">
            <CurrencyFlag code={currency} />
            <span className="text-xs font-medium text-ink-primary dark:text-white tracking-wide">
              {currency}
            </span>
          </div>
        </div>

        <p className="text-xs text-ink-muted dark:text-white text-center">
          {t('onboarding.currency.permanentHint')}
        </p>
      </div>
    </div>
  );
}
