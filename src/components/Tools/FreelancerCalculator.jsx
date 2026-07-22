import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMetaTags } from '../../hooks/useMetaTags';
import CustomSelect from '../UI/CustomSelect.jsx';
import { TOOLS, toolPath } from '../../lib/tools';
import {
  determineTreatment,
  zeroRegimeMonthly,
  monthlyContributions,
  vatFlag,
  getConfig,
  AVAILABLE_YEARS,
  DEFAULT_YEAR,
} from '../../lib/selfEmployed/freelancerTax.js';
// The reclassified branch taxes income under the Art. 24 employment brackets.
// Those brackets live in the salary engine and are IMPORTED, never copied —
// two divergent copies of the same statute is a bug.
import { incomeTax as employmentIncomeTax } from '../../lib/tax/albaniaSalary.js';

/**
 * Albania self-employed calculator — public, unauthenticated.
 *
 * The result is driven by a legal STATUS, not just arithmetic: the tool decides
 * the correct treatment first (determineTreatment), then renders the branch that
 * belongs to it. Two of the three branches deliberately compute no take-home.
 *
 * Every figure comes from the engine or CONFIG. UI affordances only below.
 */

const INITIAL_INCOME = 300000;  // realistic prefill: never an empty panel
const INITIAL_ADMIN = 20000;
const MONTHS_PER_YEAR = 12;
// Concentration answers are yes/no in the UI. "Yes" must land exactly on the
// statutory threshold so the >= test fires; "no" must sit safely below it.
// Both values are read from CONFIG at call time, never hardcoded here.
const BELOW_THRESHOLD_SHARE = 0;

const fmt = new Intl.NumberFormat('sq-AL', { maximumFractionDigits: 0 });
const money = (n) => fmt.format(Math.round(n));
const pct = (rate) => `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`;

function parseAmount(raw) {
  const digits = String(raw).replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Math.min(Number(digits), 9999999999);
}

/** Formatted numeric field with a currency suffix — mirrors the salary tool. */
function AmountField({ id, label, hint, value, onChange, currency }) {
  return (
    <div>
      <label htmlFor={id} className="block text-label font-medium text-ink-primary dark:text-white mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value ? fmt.format(value) : ''}
          onChange={(e) => onChange(parseAmount(e.target.value))}
          className="w-full py-3.5 pl-4 pr-16 text-xl font-semibold tabular-nums tracking-tight bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white border border-surface-outline dark:border-surface-dark-outline rounded-md transition-colors duration-150 hover:border-ink-muted/40 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-body text-ink-muted dark:text-white/50 pointer-events-none">
          {currency}
        </span>
      </div>
      {hint && <p className="mt-1.5 text-xs text-ink-muted dark:text-white/60 leading-relaxed">{hint}</p>}
    </div>
  );
}

/** Accessible yes/no pair — a radio group, arrow-key navigable. */
function YesNo({ question, value, onChange, t }) {
  const opts = [
    { v: true, label: t('freelancerCalc.questions.yes') },
    { v: false, label: t('freelancerCalc.questions.no') },
  ];
  return (
    <div className="py-3.5 border-b border-surface-hairline dark:border-surface-dark-hairline last:border-0">
      <p id={`q-${question.slice(0, 20)}`} className="text-body text-ink-primary dark:text-white mb-2.5 leading-relaxed">
        {question}
      </p>
      <div role="radiogroup" aria-label={question} className="inline-flex gap-1 p-1 rounded-control bg-surface-subtle dark:bg-surface-dark-subtle border border-surface-hairline dark:border-surface-dark-hairline">
        {opts.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={String(o.v)}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(o.v)}
              onKeyDown={(e) => {
                if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                  e.preventDefault();
                  onChange(!value);
                }
              }}
              className={`px-5 py-1.5 text-label rounded-control transition-colors focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 ${
                active
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'text-ink-muted dark:text-white/70 hover:text-ink-primary dark:hover:text-white'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value, sign, emphasis = false }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2.5 ${
      emphasis ? 'border-t border-surface-hairline dark:border-surface-dark-hairline pt-3.5 mt-1' : ''
    }`}>
      <span className={`text-body ${emphasis ? 'font-semibold text-ink-primary dark:text-white' : 'text-ink-muted dark:text-white/80'}`}>
        {label}
      </span>
      <span className={`tabular-nums whitespace-nowrap ${
        emphasis ? 'text-lg font-semibold text-ink-primary dark:text-white tracking-tight' : 'text-body text-ink-primary dark:text-white'
      }`}>
        {sign === '-' && <span className="text-expense mr-0.5">−</span>}
        {money(value)}
      </span>
    </div>
  );
}

export default function FreelancerCalculator() {
  const { t, i18n } = useTranslation();
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [income, setIncome] = useState(INITIAL_INCOME);
  const [admin, setAdmin] = useState(INITIAL_ADMIN);
  const [annual, setAnnual] = useState(INITIAL_INCOME * MONTHS_PER_YEAR);
  const [annualTouched, setAnnualTouched] = useState(false);
  // Prefilled to the common freelancer case: all clients abroad.
  const [allForeign, setAllForeign] = useState(true);
  const [singleClient, setSingleClient] = useState(false);
  const [twoClients, setTwoClients] = useState(false);

  const config = getConfig(year);
  const currency = t('freelancerCalc.currency');
  const salaryToolPath = TOOLS.find((x) => x.labelKey.endsWith('salaryCalculator'))?.path;
  const salaryToolHref = salaryToolPath ? toolPath(salaryToolPath, i18n.language) : null;

  const metaTitle = `${t('freelancerCalc.metaTitle', { year: config.YEAR })} | Personal Finances`;
  const metaDescription = t('freelancerCalc.metaDescription', { year: config.YEAR });
  useMetaTags({
    title: metaTitle,
    description: metaDescription,
    canonical: `https://personal-finances.app${toolPath('/tools/self-employed-calculator', i18n.language)}`,
    hreflangs: [
      { lang: 'en', href: 'https://personal-finances.app/tools/self-employed-calculator' },
      { lang: 'sq', href: 'https://personal-finances.app/sq/tools/self-employed-calculator' },
      { lang: 'x-default', href: 'https://personal-finances.app/tools/self-employed-calculator' },
    ],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: t('freelancerCalc.metaTitle', { year: config.YEAR }),
        url: `https://personal-finances.app${toolPath('/tools/self-employed-calculator', i18n.language)}`,
        description: metaDescription,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        inLanguage: i18n.language?.startsWith('sq') ? 'sq' : 'en',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        isPartOf: {
          '@type': 'WebApplication',
          name: 'Personal Finance Tracker',
          url: 'https://personal-finances.app/',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Personal Finances', item: 'https://personal-finances.app/' },
          {
            '@type': 'ListItem',
            position: 2,
            name: t('freelancerCalc.metaTitle', { year: config.YEAR }),
            item: `https://personal-finances.app${toolPath('/tools/self-employed-calculator', i18n.language)}`,
          },
        ],
      },
    ],
  });

  // Annual follows monthly until the user edits it directly (seasonal earners).
  const effectiveAnnual = annualTouched ? annual : income * MONTHS_PER_YEAR;

  const treatment = useMemo(() => {
    const k = config.CONCENTRATION;
    return determineTreatment(
      {
        allClientsForeign: allForeign,
        // "Yes" lands exactly on the statutory threshold so the >= test fires.
        singleClientMaxShare: singleClient ? k.SINGLE_CLIENT_PCT : BELOW_THRESHOLD_SHARE,
        topTwoClientsShare: twoClients ? k.FEWER_THAN_THREE_PCT : BELOW_THRESHOLD_SHARE,
        annualTurnover: effectiveAnnual,
      },
      year
    );
  }, [allForeign, singleClient, twoClients, effectiveAnnual, year, config]);

  const zero = useMemo(
    () => zeroRegimeMonthly(income, admin, year),
    [income, admin, year]
  );
  const contrib = useMemo(() => monthlyContributions(year), [year]);
  const vat = useMemo(() => vatFlag(effectiveAnnual, year), [effectiveAnnual, year]);

  // Indicative employment tax, from the SALARY engine — not re-implemented here.
  const reclassifiedTax = useMemo(
    () => (treatment.status === 'RECLASSIFIED' ? employmentIncomeTax(income, year) : 0),
    [treatment.status, income, year]
  );

  const effectiveRate = income > 0 ? (zero.contribTotal + zero.adminCosts) / income : 0;

  // Worked example: always the standard 0% case, computed live by the engine.
  const example = useMemo(() => zeroRegimeMonthly(INITIAL_INCOME, INITIAL_ADMIN, year), [year]);
  const exampleRate = example.income > 0
    ? (example.contribTotal + example.adminCosts) / example.income
    : 0;

  const yearOptions = AVAILABLE_YEARS.map((y) => ({ value: String(y), label: String(y) }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="mb-10">
        <p className="eyebrow mb-2">{t('freelancerCalc.eyebrow')}</p>
        <h1 className="font-display text-title sm:text-display text-ink-primary dark:text-white mb-3">
          {t('freelancerCalc.title', { year: config.YEAR })}
        </h1>
        <p className="text-body text-ink-muted dark:text-white/80 leading-relaxed max-w-xl">
          {t('freelancerCalc.intro', { year: config.YEAR, until: config.ZERO_REGIME_UNTIL })}
        </p>
      </div>

      {/* ── Inputs ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline rounded-container p-5 sm:p-7">
        <div className="flex justify-end mb-5">
          {AVAILABLE_YEARS.length > 1 ? (
            <div className="w-full sm:w-28">
              <CustomSelect
                value={String(year)}
                onChange={(v) => setYear(Number(v))}
                options={yearOptions}
                ariaLabel={t('freelancerCalc.taxYear')}
              />
            </div>
          ) : (
            <span className="text-label text-ink-muted dark:text-white/60 tabular-nums">
              {t('freelancerCalc.taxYearWithValue', { year: config.LABEL })}
            </span>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <AmountField
            id="fl-income"
            label={t('freelancerCalc.incomeLabel')}
            value={income}
            onChange={(v) => setIncome(v)}
            currency={currency}
          />
          <AmountField
            id="fl-admin"
            label={t('freelancerCalc.adminLabel')}
            hint={t('freelancerCalc.adminHint')}
            value={admin}
            onChange={setAdmin}
            currency={currency}
          />
        </div>

        <div className="mt-5">
          <AmountField
            id="fl-annual"
            label={t('freelancerCalc.annualLabel')}
            hint={t('freelancerCalc.annualHint')}
            value={effectiveAnnual}
            onChange={(v) => { setAnnualTouched(true); setAnnual(v); }}
            currency={currency}
          />
        </div>

        {/* ── Eligibility questions ────────────────────────────────────── */}
        <div className="mt-7 pt-6 border-t border-surface-hairline dark:border-surface-dark-hairline">
          <h2 className="text-label font-semibold text-ink-primary dark:text-white mb-1">
            {t('freelancerCalc.questions.title')}
          </h2>
          <YesNo
            question={t('freelancerCalc.questions.foreign')}
            value={allForeign}
            onChange={setAllForeign}
            t={t}
          />
          {/* The concentration test only matters when at least one client is Albanian. */}
          {!allForeign && (
            <>
              <YesNo
                question={t('freelancerCalc.questions.singleClient')}
                value={singleClient}
                onChange={setSingleClient}
                t={t}
              />
              <YesNo
                question={t('freelancerCalc.questions.twoClients')}
                value={twoClients}
                onChange={setTwoClients}
                t={t}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Result: one branch per legal status ─────────────────────────── */}
      {treatment.status === 'ZERO_REGIME' && (
        <div className="mt-6 bg-white dark:bg-surface-dark-card border-l-2 border-l-brand-600 dark:border-l-brand-400 border-t border-r border-b border-surface-hairline dark:border-surface-dark-hairline rounded-container p-5 sm:p-7">
          <div className="flex items-center gap-3 mb-1">
            <p className="text-label text-ink-muted dark:text-white/60">{t('freelancerCalc.zero.headline')}</p>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-control bg-brand-600 text-white">
              {t('freelancerCalc.zero.badge')}
            </span>
          </div>
          <p className="font-display text-[2.5rem] sm:text-[3rem] leading-none font-bold tabular-nums tracking-tight text-ink-primary dark:text-white">
            {money(zero.net)}
            <span className="text-xl font-medium text-ink-muted dark:text-white/50 ml-2">{currency}</span>
          </p>

          <div className="mt-6">
            <Row label={t('freelancerCalc.zero.rows.income')} value={zero.income} />
            <Row
              label={t('freelancerCalc.zero.rows.social', {
                rate: pct(config.CONTRIB.SOCIAL_RATE),
                base: money(config.CONTRIB.SOCIAL_BASE),
              })}
              value={zero.contribSocial}
              sign="-"
            />
            <Row
              label={t('freelancerCalc.zero.rows.health', {
                rate: pct(config.CONTRIB.HEALTH_RATE),
                base: money(config.CONTRIB.HEALTH_BASE),
              })}
              value={zero.contribHealth}
              sign="-"
            />
            <Row label={t('freelancerCalc.zero.rows.admin')} value={zero.adminCosts} sign="-" />
            <Row label={t('freelancerCalc.zero.rows.net')} value={zero.net} emphasis />
          </div>

          <p className="mt-4 text-label text-ink-muted dark:text-white/60">
            {t('freelancerCalc.zero.effectiveRate')}{' '}
            <span className="tabular-nums font-medium text-ink-primary dark:text-white">{pct(effectiveRate)}</span>
          </p>

          <p className="mt-4 text-label text-ink-muted dark:text-white/70 leading-relaxed">
            {t('freelancerCalc.zero.positive', {
              until: config.ZERO_REGIME_UNTIL,
              contrib: money(contrib.total),
            })}
          </p>
        </div>
      )}

      {treatment.status === 'RECLASSIFIED' && (
        <div className="mt-6 bg-white dark:bg-surface-dark-card border-l-2 border-l-warning border-t border-r border-b border-surface-hairline dark:border-surface-dark-hairline rounded-container p-5 sm:p-7">
          <h2 className="font-display text-heading text-ink-primary dark:text-white mb-3">
            {t('freelancerCalc.reclassified.title')}
          </h2>
          <p className="text-body text-ink-muted dark:text-white/80 leading-relaxed mb-5">
            {t('freelancerCalc.reclassified.explain')}
          </p>

          {/* Indicative only — computed by the salary engine, not a take-home figure. */}
          <div className="p-4 rounded-container bg-surface-subtle dark:bg-surface-dark-subtle mb-5">
            <p className="text-label text-ink-muted dark:text-white/70 mb-1">
              {t('freelancerCalc.reclassified.estimate', { income: money(income) })}
            </p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink-primary dark:text-white">
              {money(reclassifiedTax)} <span className="text-base font-medium text-ink-muted dark:text-white/50">{currency}</span>
            </p>
            <p className="mt-2 text-xs text-ink-muted dark:text-white/60 leading-relaxed">
              {t('freelancerCalc.reclassified.estimateNote')}
            </p>
          </div>

          {salaryToolHref && (
            <Link
              to={salaryToolHref}
              className="inline-flex items-center justify-center px-5 py-2.5 text-label font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors"
            >
              {t('freelancerCalc.reclassified.cta')}
            </Link>
          )}
          <p className="mt-4 text-label text-ink-muted dark:text-white/60 leading-relaxed">
            {t('freelancerCalc.reclassified.accountant')}
          </p>
        </div>
      )}

      {treatment.status === 'OVER_TURNOVER' && (
        <div className="mt-6 bg-white dark:bg-surface-dark-card border-l-2 border-l-expense border-t border-r border-b border-surface-hairline dark:border-surface-dark-hairline rounded-container p-5 sm:p-7">
          <h2 className="font-display text-heading text-ink-primary dark:text-white mb-3">
            {t('freelancerCalc.overTurnover.title', { limit: money(config.PROFIT_TAX_FREE_TURNOVER) })}
          </h2>
          <p className="text-body text-ink-muted dark:text-white/80 leading-relaxed mb-3">
            {t('freelancerCalc.overTurnover.explain')}
          </p>
          <p className="text-label text-ink-muted dark:text-white/60 leading-relaxed">
            {t('freelancerCalc.overTurnover.accountant')}
          </p>
        </div>
      )}

      {/* VAT is informational in every branch — never subtracted from take-home. */}
      {vat.mustRegister && (
        <div className="mt-5 p-4 rounded-container border border-surface-hairline dark:border-surface-dark-hairline bg-surface-subtle dark:bg-surface-dark-subtle">
          <p className="text-label font-semibold text-ink-primary dark:text-white mb-1">
            {t('freelancerCalc.vat.title')}
          </p>
          <p className="text-label text-ink-muted dark:text-white/70 leading-relaxed">
            {t('freelancerCalc.vat.desc', { threshold: money(vat.threshold) })}
          </p>
        </div>
      )}

      {/* ── Worked example — every value from the engine ─────────────────── */}
      <section className="mt-12 pt-10 border-t border-surface-hairline dark:border-surface-dark-hairline">
        <h2 className="font-display text-heading text-ink-primary dark:text-white mb-4">
          {t('freelancerCalc.example.title', { income: money(example.income) })}
        </h2>
        <div className="space-y-3 text-body text-ink-muted dark:text-white/80 leading-relaxed">
          <p>
            {t('freelancerCalc.example.p1', {
              ceiling: money(config.PROFIT_TAX_FREE_TURNOVER),
              tax: money(example.incomeTax),
            })}
          </p>
          <p>
            {t('freelancerCalc.example.p2', {
              social: money(example.contribSocial),
              health: money(example.contribHealth),
              contrib: money(example.contribTotal),
            })}
          </p>
          <p>
            {t('freelancerCalc.example.p3', {
              admin: money(example.adminCosts),
              net: money(example.net),
              income: money(example.income),
              rate: pct(exampleRate),
            })}
          </p>
        </div>

        <p className="mt-6 text-label text-ink-muted dark:text-white/60 leading-relaxed">
          {t('freelancerCalc.disclaimer', { year: config.YEAR })}
        </p>
      </section>
    </div>
  );
}
