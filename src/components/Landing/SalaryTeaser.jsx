import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { toolPath } from '../../lib/tools';
import { MINUS } from '../../utils/bento';
import { fromGross, getConfig, DEFAULT_YEAR } from '../../lib/tax/albaniaSalary.js';
import PrimaryCta from './PrimaryCta';

/**
 * Compact gross-to-net calculator for the landing tools section. Lazy
 * (LandingPage mounts it in Suspense with a min-height fallback), so the
 * tax engine never enters the landing chunk.
 *
 * Every figure comes from the engine (lib/tax): no formula and no rate is
 * typed here. The default amount is the engine's contribution floor, which
 * is the minimum wage it uses.
 */

const fmt = new Intl.NumberFormat('sq-AL', { maximumFractionDigits: 0 });
const amount = (n) => fmt.format(Math.round(n));
const pct = (rate) => `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`;
const MAX_INPUT = 99999999;

function parseAmount(raw) {
  const digits = String(raw).replace(/[^\d]/g, '');
  return digits ? Math.min(Number(digits), MAX_INPUT) : 0;
}

export default function SalaryTeaser() {
  const { t, i18n } = useTranslation();
  const config = getConfig(DEFAULT_YEAR);
  const [gross, setGross] = useState(config.CONTRIB.BASE_MIN);
  const b = useMemo(() => (gross > 0 ? fromGross(gross, DEFAULT_YEAR) : null), [gross]);
  // Arrives showing its result; counts up when the visitor changes the amount.
  const [initialNet] = useState(() => (b ? b.net : 0));
  const netShown = useCountUp(b ? b.net : 0, { from: initialNet });
  const currency = t('salaryCalc.currency');

  // Tax is listed with the two contributions so the lines always add up to
  // gross minus net (it is 0 at the minimum wage).
  const rows = b ? [
    [t('salaryCalc.rows.incomeTax'), b.incomeTax],
    [t('salaryCalc.rows.social', { rate: pct(config.CONTRIB.EMPLOYEE_SOCIAL) }), b.employeeSocial],
    [t('salaryCalc.rows.health', { rate: pct(config.CONTRIB.EMPLOYEE_HEALTH) }), b.employeeHealth],
  ] : [];

  return (
    <div className="tile p-tile-dense sm:p-tile" data-salary-teaser>
      <div className="grid sm:grid-cols-2 gap-gap items-start">
        <div className="min-w-0">
          <label htmlFor="landing-salary" className="block text-sm font-bold text-fg">
            {t('salaryCalc.amountLabel.grossToNet')}
          </label>
          <div className="relative mt-2">
            <input
              id="landing-salary"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={gross ? fmt.format(gross) : ''}
              onChange={(e) => setGross(parseAmount(e.target.value))}
              className="w-full py-3 pl-4 pr-16 text-h1 font-extrabold tabular-nums bg-tile text-fg border-2 border-line rounded-input btn-motion hover:border-inner-2 focus:border-brand-600 dark:focus:border-brand-400"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-body font-bold text-fg pointer-events-none">{currency}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-fg">
            {t('salaryCalc.taxYearWithValue', { year: config.LABEL })}
          </p>
        </div>

        <div className="tile-inner p-gap min-w-0" aria-live="polite">
          <p className="text-sm font-bold text-fg">{t('salaryCalc.headlineLabel.grossToNet')}</p>
          <p className="mt-1 text-h1 font-extrabold text-fg tabular-nums">
            {amount(netShown)} <span className="text-body font-bold">{currency}</span>
          </p>
          <dl className="mt-3 flex flex-col gap-1.5">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 text-sm">
                <dt className="font-semibold text-fg">{label}</dt>
                <dd className="font-bold text-fg tabular-nums whitespace-nowrap">{value > 0 ? MINUS : ''}{amount(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-line flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-5 gap-y-3">
        <p className="text-body font-bold text-fg sm:basis-full">{t('landing.tools.ctaLine')}</p>
        <PrimaryCta location="tools" className="self-stretch sm:self-auto" />
        <Link
          to={toolPath('/tools/salary-calculator', i18n.language)}
          className="group inline-flex items-center justify-center sm:justify-start gap-2 min-h-11 font-bold text-fg underline-offset-4 decoration-2 hover:underline focus-visible:underline"
        >
          {t('landing.tools.fullCalc')}
          <ArrowRight className="arrow-nudge w-[18px] h-[18px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
