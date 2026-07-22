import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMetaTags } from '../../hooks/useMetaTags';
import CustomSelect from '../UI/CustomSelect.jsx';
import { toolPath, localizedPath } from '../../lib/tools';
import { savePendingLoanRecurring } from '../../lib/loan/prefill.js';
import {
  DEFAULTS,
  monthlyPayment,
  totals,
  totalCost,
  schedule,
  termWithExtraPayment,
  rateShocks,
  fxShocks,
  debtToIncome,
} from '../../lib/loan/loanMath.js';

/**
 * Loan / mortgage calculator — public, unauthenticated. Sibling of the salary
 * and self-employed calculators: same tokens, same components, same head/meta
 * plumbing.
 *
 * RULE: every number rendered here comes from the engine or DEFAULTS. The only
 * literals are UI affordances (slider bounds, preset chips). No exchange rate is
 * hardcoded outside DEFAULTS, and it is presented as user-editable.
 */

// Slider/preset bounds are UI affordances, not financial truths.
const TERM_MIN = 1;
const TERM_MAX = 35;      // years — covers the longest Albanian mortgages
const RATE_MAX = 15;      // % — slider ceiling; the field itself is unbounded upward within reason
const AMOUNT_PRESETS_ALL = [2000000, 5000000, 10000000, 15000000, 20000000];
const AMOUNT_PRESETS_EUR = [20000, 50000, 100000, 150000, 200000];
const SCHEDULE_PREVIEW_YEARS = 3; // years shown before "show all" for a long loan

const fmtALL = new Intl.NumberFormat('sq-AL', { maximumFractionDigits: 0 });
const fmtEUR = new Intl.NumberFormat('sq-AL', { maximumFractionDigits: 0 });
const money = (n) => fmtALL.format(Math.round(n || 0));
// Rate as a decimal → "3.5%" without a trailing ".0".
const pct1 = (rate) => `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`;
const pct0 = (rate) => `${Math.round(rate * 100)}%`;

function parseAmount(raw) {
  const digits = String(raw).replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Math.min(Number(digits), 9999999999);
}

// Rate typed as a percent, kept as a decimal in state. Allows one decimal place.
function parseRate(raw) {
  const cleaned = String(raw).replace(/[^\d.,]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  if (!Number.isFinite(val) || val < 0) return 0;
  return Math.min(val, 100) / 100;
}

/** One breakdown line. `emphasis` marks the total/headline row. */
function Row({ label, value, currency, sign, emphasis = false, muted = false }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2.5 ${
        emphasis ? 'border-t border-surface-hairline dark:border-surface-dark-hairline pt-3.5 mt-1' : ''
      }`}
    >
      <span
        className={`text-body ${
          emphasis
            ? 'font-semibold text-ink-primary dark:text-white'
            : muted
              ? 'text-ink-muted dark:text-white/60'
              : 'text-ink-muted dark:text-white/80'
        }`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums whitespace-nowrap ${
          emphasis
            ? 'text-lg font-semibold text-ink-primary dark:text-white tracking-tight'
            : 'text-body text-ink-primary dark:text-white'
        }`}
      >
        {sign === '-' && <span className="text-expense mr-0.5">−</span>}
        {money(value)}
        <span className="text-ink-muted dark:text-white/50 ml-1 text-sm font-normal">{currency}</span>
      </span>
    </div>
  );
}

/** Thin stacked bar: principal vs interest over the life of the loan. No chart lib. */
function SplitBar({ principal, interest, t }) {
  const total = principal + interest;
  if (!(total > 0)) return null;
  const parts = [
    { w: principal / total, cls: 'bg-brand-600 dark:bg-brand-400', label: t('loanCalc.schedule.colPrincipal') },
    { w: interest / total, cls: 'bg-expense', label: t('loanCalc.schedule.colInterest') },
  ];
  return (
    <div className="mt-6">
      <div className="flex h-2 rounded-full overflow-hidden bg-surface-subtle dark:bg-surface-dark-subtle">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${p.w * 100}%` }} className={p.cls} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5 text-xs text-ink-muted dark:text-white/60">
            <span className={`w-2 h-2 rounded-full ${p.cls}`} />
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A titled result section wrapper. */
function Panel({ title, desc, children, className = '' }) {
  return (
    <section className={`mt-12 pt-10 border-t border-surface-hairline dark:border-surface-dark-hairline ${className}`}>
      <h2 className="font-display text-heading text-ink-primary dark:text-white mb-2">{title}</h2>
      {desc && <p className="text-body text-ink-muted dark:text-white/80 mb-5 max-w-xl leading-relaxed">{desc}</p>}
      {children}
    </section>
  );
}

/**
 * Amortization schedule, grouped by year. Collapsed by default. For a long loan
 * only the first few years show until the user expands, and a first/last
 * installment summary always appears so the shape is legible without scanning
 * 240 rows.
 */
function ScheduleTable({ rows, currency, t }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const years = useMemo(() => {
    const byYear = [];
    rows.forEach((r, idx) => {
      const y = Math.floor(idx / 12);
      if (!byYear[y]) byYear[y] = { year: y + 1, rows: [] };
      byYear[y].rows.push(r);
    });
    return byYear.map((g) => {
      const interest = g.rows.reduce((s, r) => s + r.interest, 0);
      const principal = g.rows.reduce((s, r) => s + r.principal, 0);
      const endBalance = g.rows[g.rows.length - 1].balance;
      return { ...g, interest, principal, endBalance };
    });
  }, [rows]);

  if (rows.length === 0) return null;

  const visibleYears = showAll ? years : years.slice(0, SCHEDULE_PREVIEW_YEARS);
  const first = rows[0];
  const last = rows[rows.length - 1];

  return (
    <Panel title={t('loanCalc.schedule.title')} desc={open ? t('loanCalc.schedule.desc') : undefined}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-4 py-2 text-label font-medium rounded-control border border-surface-outline dark:border-surface-dark-outline text-ink-primary dark:text-white hover:bg-surface-subtle dark:hover:bg-surface-dark-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15"
      >
        {open ? t('loanCalc.schedule.hide') : t('loanCalc.schedule.show')}
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* First / last installment summary — always visible once opened. */}
      {open && (
        <>
          {/* Plain-language explainer: pure amortization concept (universal
              math), deliberately no claim about how a specific Albanian bank
              sets its rate. */}
          <div className="mt-5 rounded-container bg-surface-subtle dark:bg-surface-dark-subtle border-l-2 border-l-brand-600 dark:border-l-brand-400 p-4 sm:p-5">
            <p className="text-body text-ink-primary dark:text-white leading-relaxed">
              {t('loanCalc.schedule.explainTitle')}
            </p>
            <p className="mt-2 text-label text-ink-muted dark:text-white/80 leading-relaxed">
              {t('loanCalc.schedule.explainBody')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            {[
              { label: t('loanCalc.schedule.firstRow'), r: first },
              { label: t('loanCalc.schedule.lastRow'), r: last },
            ].map(({ label, r }) => (
              <div key={label} className="rounded-container border border-surface-hairline dark:border-surface-dark-hairline p-4">
                <p className="text-label text-ink-muted dark:text-white/60 mb-2">{label}</p>
                <div className="flex justify-between text-sm tabular-nums text-ink-primary dark:text-white">
                  <span className="text-ink-muted dark:text-white/70">{t('loanCalc.schedule.colInterest')}</span>
                  <span>{money(r.interest)} {currency}</span>
                </div>
                <div className="flex justify-between text-sm tabular-nums text-ink-primary dark:text-white mt-1">
                  <span className="text-ink-muted dark:text-white/70">{t('loanCalc.schedule.colPrincipal')}</span>
                  <span>{money(r.principal)} {currency}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Year-grouped table — scrolls inside its own container on mobile. */}
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mt-6">
            <table className="w-full min-w-[460px] border-collapse">
              <thead>
                <tr className="border-b border-surface-hairline dark:border-surface-dark-hairline">
                  <th scope="col" className="text-left py-2.5 pr-3 text-label font-medium text-ink-muted dark:text-white/60">
                    {t('loanCalc.schedule.year', { year: '' }).trim()}
                  </th>
                  <th scope="col" className="text-right py-2.5 px-3 text-label font-medium text-ink-muted dark:text-white/60">
                    {t('loanCalc.schedule.yearInterest')}
                  </th>
                  <th scope="col" className="text-right py-2.5 px-3 text-label font-medium text-ink-muted dark:text-white/60">
                    {t('loanCalc.schedule.yearPrincipal')}
                  </th>
                  <th scope="col" className="text-right py-2.5 pl-3 text-label font-semibold text-ink-primary dark:text-white">
                    {t('loanCalc.schedule.endBalance')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleYears.map((g) => (
                  <tr key={g.year} className="border-b border-surface-hairline dark:border-surface-dark-hairline last:border-0">
                    <td className="py-2.5 pr-3 text-body tabular-nums font-medium text-ink-primary dark:text-white">
                      {g.year}
                    </td>
                    <td className="py-2.5 px-3 text-body tabular-nums text-right text-expense">
                      {money(g.interest)}
                    </td>
                    <td className="py-2.5 px-3 text-body tabular-nums text-right text-ink-muted dark:text-white/70">
                      {money(g.principal)}
                    </td>
                    <td className="py-2.5 pl-3 text-body tabular-nums text-right font-semibold text-ink-primary dark:text-white">
                      {money(g.endBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {years.length > SCHEDULE_PREVIEW_YEARS && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="mt-4 text-label font-medium text-brand-600 dark:text-brand-400 hover:underline focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 rounded"
            >
              {showAll ? t('loanCalc.schedule.hide') : t('loanCalc.schedule.show')}
            </button>
          )}
        </>
      )}
    </Panel>
  );
}

export default function LoanCalculator() {
  const { t, i18n } = useTranslation();

  // Prefilled from DEFAULTS — the page renders a full result on first paint.
  const [amount, setAmount] = useState(DEFAULTS.PRINCIPAL);
  const [rate, setRate] = useState(DEFAULTS.ANNUAL_RATE);
  const [termYears, setTermYears] = useState(DEFAULTS.TERM_YEARS);
  const [currency, setCurrency] = useState(DEFAULTS.CURRENCY);
  const [eurToAll, setEurToAll] = useState(DEFAULTS.EUR_TO_ALL);
  const [showFees, setShowFees] = useState(false);
  const [disbursementPct, setDisbursementPct] = useState(DEFAULTS.DISBURSEMENT_FEE_PCT);
  const [annualInsurance, setAnnualInsurance] = useState(DEFAULTS.ANNUAL_INSURANCE);
  const [upfrontCosts, setUpfrontCosts] = useState(DEFAULTS.UPFRONT_COSTS);
  const [netIncome, setNetIncome] = useState(0);
  const [extraMonthly, setExtraMonthly] = useState(0);

  const isEur = currency === 'EUR';
  const cur = currency; // display affix ("ALL" | "EUR")
  const months = termYears * 12;

  // Every derived figure comes from a single engine pass over the inputs.
  const result = useMemo(() => {
    const payment = monthlyPayment(amount, rate, months);
    const tot = totals(amount, rate, months);
    const cost = totalCost(amount, rate, months, {
      disbursementFeePct: showFees ? disbursementPct : 0,
      annualInsurance: showFees ? annualInsurance : 0,
      upfrontCosts: showFees ? upfrontCosts : 0,
    });
    const rows = schedule(amount, rate, months);
    return { payment, tot, cost, rows };
  }, [amount, rate, months, showFees, disbursementPct, annualInsurance, upfrontCosts]);

  const interestShare = amount > 0 ? result.tot.totalInterest / amount : 0;

  // DTI — income and installment must be in the same currency. Income is entered
  // in ALL (most Albanian incomes), so convert a EUR installment to ALL first.
  const paymentInAll = isEur ? result.payment * eurToAll : result.payment;
  const dti = debtToIncome(paymentInAll, netIncome);
  const dtiLevel = dti
    ? dti.ratio < DEFAULTS.DTI_WARN * 0.9
      ? 'ok'
      : dti.ratio <= DEFAULTS.DTI_WARN
        ? 'warn'
        : 'high'
    : null;

  const rShocks = useMemo(
    () => rateShocks(amount, rate, months, DEFAULTS.RATE_SHOCKS),
    [amount, rate, months]
  );
  const xShocks = useMemo(
    () => (isEur ? fxShocks(result.payment, eurToAll, DEFAULTS.FX_SHOCKS) : []),
    [isEur, result.payment, eurToAll]
  );

  const early = useMemo(
    () => (extraMonthly > 0 ? termWithExtraPayment(amount, rate, months, extraMonthly) : null),
    [amount, rate, months, extraMonthly]
  );

  // Worked example: recompute the DEFAULT scenario live, never static text.
  const example = useMemo(() => {
    const p = monthlyPayment(DEFAULTS.PRINCIPAL, DEFAULTS.ANNUAL_RATE, DEFAULTS.TERM_YEARS * 12);
    const tot = totals(DEFAULTS.PRINCIPAL, DEFAULTS.ANNUAL_RATE, DEFAULTS.TERM_YEARS * 12);
    return { payment: p, ...tot, share: tot.totalInterest / DEFAULTS.PRINCIPAL };
  }, []);

  const termLabel = t('loanCalc.inputs.termYears', { count: termYears });
  const presets = isEur ? AMOUNT_PRESETS_EUR : AMOUNT_PRESETS_ALL;

  const currencyOptions = [
    { value: 'ALL', label: 'ALL (Lekë)' },
    { value: 'EUR', label: 'EUR (Euro)' },
  ];

  const metaTitle = `${t('loanCalc.metaTitle')} | Personal Finances`;
  const metaDescription = t('loanCalc.metaDescription');
  useMetaTags({
    title: metaTitle,
    description: metaDescription,
    canonical: `https://personal-finances.app${toolPath('/tools/loan-calculator', i18n.language)}`,
    hreflangs: [
      { lang: 'en', href: 'https://personal-finances.app/tools/loan-calculator' },
      { lang: 'sq', href: 'https://personal-finances.app/sq/tools/loan-calculator' },
      { lang: 'x-default', href: 'https://personal-finances.app/tools/loan-calculator' },
    ],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: t('loanCalc.metaTitle'),
        url: `https://personal-finances.app${toolPath('/tools/loan-calculator', i18n.language)}`,
        description: metaDescription,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        inLanguage: i18n.language?.startsWith('sq') ? 'sq' : 'en',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        isPartOf: {
          '@type': 'WebSite',
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
            name: t('loanCalc.metaTitle'),
            item: `https://personal-finances.app${toolPath('/tools/loan-calculator', i18n.language)}`,
          },
        ],
      },
    ],
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="eyebrow mb-2">{t('loanCalc.eyebrow')}</p>
        <h1 className="font-display text-title sm:text-display text-ink-primary dark:text-white mb-3">
          {t('loanCalc.title')}
        </h1>
        <p className="text-body text-ink-muted dark:text-white/80 leading-relaxed max-w-xl">
          {t('loanCalc.intro')}
        </p>
      </div>

      {/* ── Inputs ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline rounded-container p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <h2 className="font-display text-heading text-ink-primary dark:text-white">
            {t('loanCalc.inputs.title')}
          </h2>
          <div className="w-full sm:w-40">
            <CustomSelect
              value={currency}
              onChange={setCurrency}
              options={currencyOptions}
              ariaLabel={t('loanCalc.inputs.currency')}
            />
          </div>
        </div>

        {/* Loan amount */}
        <label htmlFor="loan-amount" className="block text-label font-medium text-ink-primary dark:text-white mb-2">
          {t('loanCalc.inputs.amount')}
        </label>
        <div className="relative">
          <input
            id="loan-amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={amount ? fmtALL.format(amount) : ''}
            onChange={(e) => setAmount(parseAmount(e.target.value))}
            className="w-full py-4 pl-4 pr-16 text-2xl font-semibold tabular-nums tracking-tight bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white border border-surface-outline dark:border-surface-dark-outline rounded-md transition-colors duration-150 hover:border-ink-muted/40 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-body text-ink-muted dark:text-white/50 pointer-events-none">
            {cur}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {presets.map((p) => {
            const selected = amount === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                aria-pressed={selected}
                className={`px-3 py-1.5 text-label rounded-control border tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 ${
                  selected
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400 font-semibold'
                    : 'border-surface-outline dark:border-surface-dark-outline text-ink-muted dark:text-white/70 hover:border-ink-muted/40 dark:hover:border-white/20'
                }`}
              >
                {money(p / 1000)}K
              </button>
            );
          })}
        </div>

        {/* Rate + term */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-7">
          <div>
            <label htmlFor="loan-rate" className="block text-label font-medium text-ink-primary dark:text-white mb-2">
              {t('loanCalc.inputs.rate')}
            </label>
            <div className="relative">
              <input
                id="loan-rate"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={pct1(rate).replace('%', '')}
                onChange={(e) => setRate(parseRate(e.target.value))}
                className="w-full py-3 pl-4 pr-10 text-lg font-semibold tabular-nums bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white border border-surface-outline dark:border-surface-dark-outline rounded-md transition-colors duration-150 hover:border-ink-muted/40 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-body text-ink-muted dark:text-white/50 pointer-events-none">%</span>
            </div>
            <input
              type="range"
              min={0}
              max={RATE_MAX * 10}
              step={1}
              value={Math.min(Math.round(rate * 1000), RATE_MAX * 10)}
              onChange={(e) => setRate(Number(e.target.value) / 1000)}
              aria-label={t('loanCalc.inputs.rate')}
              className="w-full mt-3 accent-brand-600 dark:accent-brand-400 cursor-pointer"
            />
          </div>

          <div>
            <label htmlFor="loan-term" className="block text-label font-medium text-ink-primary dark:text-white mb-2">
              {t('loanCalc.inputs.term')}
            </label>
            <div className="py-3 pl-4 pr-4 text-lg font-semibold tabular-nums bg-surface-subtle dark:bg-surface-dark-subtle text-ink-primary dark:text-white border border-surface-outline dark:border-surface-dark-outline rounded-md">
              {termLabel}
            </div>
            <input
              id="loan-term"
              type="range"
              min={TERM_MIN}
              max={TERM_MAX}
              step={1}
              value={termYears}
              onChange={(e) => setTermYears(Number(e.target.value))}
              aria-label={t('loanCalc.inputs.term')}
              className="w-full mt-3 accent-brand-600 dark:accent-brand-400 cursor-pointer"
            />
          </div>
        </div>

        {/* EUR-only exchange rate — clearly an adjustable estimate. */}
        {isEur && (
          <div className="mt-5">
            <label htmlFor="loan-fx" className="block text-label font-medium text-ink-primary dark:text-white mb-2">
              {t('loanCalc.inputs.exchangeRate')}
            </label>
            <div className="relative max-w-[220px]">
              <input
                id="loan-fx"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={eurToAll || ''}
                onChange={(e) => {
                  const v = parseFloat(String(e.target.value).replace(',', '.'));
                  setEurToAll(Number.isFinite(v) && v > 0 ? v : 0);
                }}
                className="w-full py-3 pl-4 pr-16 text-lg font-semibold tabular-nums bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white border border-surface-outline dark:border-surface-dark-outline rounded-md transition-colors duration-150 hover:border-ink-muted/40 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-muted dark:text-white/50 pointer-events-none">ALL/EUR</span>
            </div>
            <p className="mt-1.5 text-xs text-ink-muted dark:text-white/60 max-w-md leading-relaxed">
              {t('loanCalc.inputs.exchangeRateHint')}
            </p>
          </div>
        )}

        {/* Optional fees */}
        <div className="mt-7 pt-5 border-t border-surface-hairline dark:border-surface-dark-hairline">
          <button
            type="button"
            onClick={() => setShowFees((s) => !s)}
            aria-expanded={showFees}
            className="inline-flex items-center gap-2 text-label font-medium text-ink-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 rounded"
          >
            {t('loanCalc.inputs.moreOptions')}
            <svg className={`w-4 h-4 transition-transform ${showFees ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showFees && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="fee-disb" className="block text-xs font-medium text-ink-muted dark:text-white/70 mb-1.5">
                  {t('loanCalc.inputs.disbursementFee')}
                </label>
                <div className="relative">
                  <input
                    id="fee-disb"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={(disbursementPct * 100).toString().replace(/\.0$/, '')}
                    onChange={(e) => setDisbursementPct(parseRate(e.target.value))}
                    className="w-full py-2.5 pl-3 pr-8 text-body tabular-nums bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white border border-surface-outline dark:border-surface-dark-outline rounded-md focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted dark:text-white/50 pointer-events-none">%</span>
                </div>
              </div>
              <div>
                <label htmlFor="fee-ins" className="block text-xs font-medium text-ink-muted dark:text-white/70 mb-1.5">
                  {t('loanCalc.inputs.annualInsurance')}
                </label>
                <input
                  id="fee-ins"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={annualInsurance ? fmtALL.format(annualInsurance) : ''}
                  onChange={(e) => setAnnualInsurance(parseAmount(e.target.value))}
                  className="w-full py-2.5 px-3 text-body tabular-nums bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white border border-surface-outline dark:border-surface-dark-outline rounded-md focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40"
                />
              </div>
              <div>
                <label htmlFor="fee-up" className="block text-xs font-medium text-ink-muted dark:text-white/70 mb-1.5">
                  {t('loanCalc.inputs.upfrontCosts')}
                </label>
                <input
                  id="fee-up"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={upfrontCosts ? fmtALL.format(upfrontCosts) : ''}
                  onChange={(e) => setUpfrontCosts(parseAmount(e.target.value))}
                  className="w-full py-2.5 px-3 text-body tabular-nums bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white border border-surface-outline dark:border-surface-dark-outline rounded-md focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Headline result ────────────────────────────────────────────── */}
      <div className="mt-6 bg-white dark:bg-surface-dark-card border-l-2 border-l-brand-600 dark:border-l-brand-400 border-t border-r border-b border-surface-hairline dark:border-surface-dark-hairline rounded-container p-5 sm:p-7">
        <p className="text-label text-ink-muted dark:text-white/60 mb-1">{t('loanCalc.headline.label')}</p>
        <p className="font-display text-[2.5rem] sm:text-[3rem] leading-none font-bold tabular-nums tracking-tight text-ink-primary dark:text-white">
          {money(result.payment)}
          <span className="text-xl font-medium text-ink-muted dark:text-white/50 ml-2">{cur}</span>
        </p>
        {isEur && eurToAll > 0 && (
          <p className="mt-2 text-body text-ink-muted dark:text-white/70 tabular-nums">
            {t('loanCalc.headline.eurEquivalent', { amount: money(result.payment * eurToAll) })}
          </p>
        )}

        {/* Breakdown */}
        <div className="mt-6">
          <Row label={t('loanCalc.breakdown.totalPaid')} value={result.tot.totalPaid} currency={cur} />
          <Row label={t('loanCalc.breakdown.totalInterest')} value={result.tot.totalInterest} currency={cur} sign="-" />
          {showFees && (
            <Row label={t('loanCalc.breakdown.totalCost')} value={result.cost.total} currency={cur} emphasis />
          )}
        </div>

        <p className="mt-4 text-label text-ink-muted dark:text-white/60">
          {t('loanCalc.breakdown.interestShare')}{' '}
          <span className="tabular-nums font-semibold text-expense">{pct0(interestShare)}</span>
        </p>

        <SplitBar principal={amount} interest={result.tot.totalInterest} t={t} />
      </div>

      {/* ── Total cost of credit (when fees entered) ───────────────────── */}
      {showFees && result.cost.total > result.tot.totalInterest && (
        <Panel title={t('loanCalc.breakdown.totalCost')} desc={t('loanCalc.breakdown.totalCostHint')}>
          <div className="bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline rounded-container p-5">
            <Row label={t('loanCalc.breakdown.costRows.interest')} value={result.cost.interest} currency={cur} />
            <Row label={t('loanCalc.breakdown.costRows.disbursement')} value={result.cost.disbursement} currency={cur} />
            <Row label={t('loanCalc.breakdown.costRows.insurance')} value={result.cost.insurance} currency={cur} />
            <Row label={t('loanCalc.breakdown.costRows.upfront')} value={result.cost.upfront} currency={cur} />
            <Row label={t('loanCalc.breakdown.totalCost')} value={result.cost.total} currency={cur} emphasis />
          </div>
        </Panel>
      )}

      {/* ── Debt-to-income (optional) ──────────────────────────────────── */}
      <Panel title={t('loanCalc.dti.title')}>
        <label htmlFor="loan-income" className="block text-label font-medium text-ink-primary dark:text-white mb-2">
          {t('loanCalc.dti.incomeLabel')}
        </label>
        <div className="relative max-w-xs">
          <input
            id="loan-income"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={netIncome ? fmtALL.format(netIncome) : ''}
            onChange={(e) => setNetIncome(parseAmount(e.target.value))}
            className="w-full py-3 pl-4 pr-14 text-lg font-semibold tabular-nums bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white border border-surface-outline dark:border-surface-dark-outline rounded-md transition-colors duration-150 hover:border-ink-muted/40 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-muted dark:text-white/50 pointer-events-none">ALL</span>
        </div>
        <p className="mt-1.5 text-xs text-ink-muted dark:text-white/60">{t('loanCalc.dti.incomeHint')}</p>

        {dti && (
          <div className="mt-5 rounded-container border border-surface-hairline dark:border-surface-dark-hairline p-5">
            <p className="text-body text-ink-primary dark:text-white">
              {t('loanCalc.dti.ratio', { ratio: pct0(dti.ratio) })}
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  dtiLevel === 'ok' ? 'bg-brand-600 dark:bg-brand-400' : dtiLevel === 'warn' ? 'bg-warning' : 'bg-expense'
                }`}
              />
              <span className="text-label text-ink-muted dark:text-white/80">
                {t(`loanCalc.dti.level${dtiLevel === 'ok' ? 'Ok' : dtiLevel === 'warn' ? 'Warn' : 'High'}`)}
              </span>
            </div>
            <p className="mt-3 text-xs text-ink-muted dark:text-white/60 leading-relaxed">
              {t('loanCalc.dti.orientation')}
            </p>
          </div>
        )}
      </Panel>

      {/* ── Rate shock ─────────────────────────────────────────────────── */}
      <Panel title={t('loanCalc.rateShock.title')} desc={t('loanCalc.rateShock.desc')}>
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full min-w-[380px] border-collapse">
            <thead>
              <tr className="border-b border-surface-hairline dark:border-surface-dark-hairline">
                <th scope="col" className="text-left py-2.5 pr-3 text-label font-medium text-ink-muted dark:text-white/60">{t('loanCalc.rateShock.colScenario')}</th>
                <th scope="col" className="text-right py-2.5 px-3 text-label font-medium text-ink-muted dark:text-white/60">{t('loanCalc.rateShock.colInstallment')}</th>
                <th scope="col" className="text-right py-2.5 pl-3 text-label font-medium text-ink-muted dark:text-white/60">{t('loanCalc.rateShock.colDelta')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-surface-hairline dark:border-surface-dark-hairline">
                <td className="py-2.5 pr-3 text-body tabular-nums text-ink-primary dark:text-white">{pct1(rate)}</td>
                <td className="py-2.5 px-3 text-body tabular-nums text-right font-semibold text-ink-primary dark:text-white">{money(result.payment)} {cur}</td>
                <td className="py-2.5 pl-3 text-body tabular-nums text-right text-ink-muted dark:text-white/60">—</td>
              </tr>
              {rShocks.map((s) => (
                <tr key={s.shock} className="border-b border-surface-hairline dark:border-surface-dark-hairline last:border-0">
                  <td className="py-2.5 pr-3 text-body tabular-nums text-ink-primary dark:text-white">
                    {pct1(s.rate)} <span className="text-xs text-ink-muted dark:text-white/50">{t('loanCalc.rateShock.plus', { pp: Math.round(s.shock * 100) })}</span>
                  </td>
                  <td className="py-2.5 px-3 text-body tabular-nums text-right text-ink-primary dark:text-white">{money(s.payment)} {cur}</td>
                  <td className="py-2.5 pl-3 text-body tabular-nums text-right text-expense">+{money(s.delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── FX shock (EUR only) — the differentiator, given real weight ── */}
      {isEur && xShocks.length > 0 && (
        <Panel
          title={t('loanCalc.fxShock.title')}
          desc={t('loanCalc.fxShock.desc')}
        >
          <div className="bg-white dark:bg-surface-dark-card border-l-2 border-l-expense border-t border-r border-b border-surface-hairline dark:border-surface-dark-hairline rounded-container p-5 overflow-x-auto">
            <table className="w-full min-w-[380px] border-collapse">
              <thead>
                <tr className="border-b border-surface-hairline dark:border-surface-dark-hairline">
                  <th scope="col" className="text-left py-2.5 pr-3 text-label font-medium text-ink-muted dark:text-white/60">{t('loanCalc.fxShock.colScenario')}</th>
                  <th scope="col" className="text-right py-2.5 px-3 text-label font-medium text-ink-muted dark:text-white/60">{t('loanCalc.fxShock.colInstallment')}</th>
                  <th scope="col" className="text-right py-2.5 pl-3 text-label font-medium text-ink-muted dark:text-white/60">{t('loanCalc.fxShock.colDelta')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-surface-hairline dark:border-surface-dark-hairline">
                  <td className="py-2.5 pr-3 text-body tabular-nums text-ink-muted dark:text-white/70">{eurToAll} ALL/EUR</td>
                  <td className="py-2.5 px-3 text-body tabular-nums text-right font-semibold text-ink-primary dark:text-white">{money(result.payment * eurToAll)} ALL</td>
                  <td className="py-2.5 pl-3 text-body tabular-nums text-right text-ink-muted dark:text-white/60">—</td>
                </tr>
                {xShocks.map((s) => (
                  <tr key={s.shock} className="border-b border-surface-hairline dark:border-surface-dark-hairline last:border-0">
                    <td className="py-2.5 pr-3 text-body tabular-nums text-ink-primary dark:text-white">+{pct0(s.shock)}</td>
                    <td className="py-2.5 px-3 text-body tabular-nums text-right text-ink-primary dark:text-white">{money(s.paymentAll)} ALL</td>
                    <td className="py-2.5 pl-3 text-body tabular-nums text-right text-expense">+{money(s.delta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── Early repayment ────────────────────────────────────────────── */}
      <Panel title={t('loanCalc.early.title')}>
        <label htmlFor="loan-extra" className="block text-label font-medium text-ink-primary dark:text-white mb-2">
          {t('loanCalc.early.extraLabel')}
        </label>
        <div className="relative max-w-xs">
          <input
            id="loan-extra"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={extraMonthly ? fmtALL.format(extraMonthly) : ''}
            onChange={(e) => setExtraMonthly(parseAmount(e.target.value))}
            className="w-full py-3 pl-4 pr-14 text-lg font-semibold tabular-nums bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white border border-surface-outline dark:border-surface-dark-outline rounded-md transition-colors duration-150 hover:border-ink-muted/40 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-muted dark:text-white/50 pointer-events-none">{cur}</span>
        </div>

        {/* The required installment does not change — the extra is a voluntary
            top-up. Spell out the new total so the extra isn't mistaken for a
            higher base installment. */}
        {extraMonthly > 0 && (
          <p className="mt-2.5 text-label text-ink-muted dark:text-white/80 leading-relaxed max-w-lg">
            {t('loanCalc.early.totalPayment', {
              total: `${money(result.payment + extraMonthly)} ${cur}`,
              base: `${money(result.payment)} ${cur}`,
              extra: `${money(extraMonthly)} ${cur}`,
            })}
          </p>
        )}

        {early ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <div className="rounded-container border border-surface-hairline dark:border-surface-dark-hairline p-5">
              <p className="text-label text-ink-muted dark:text-white/60 mb-1">{t('loanCalc.early.monthsSaved')}</p>
              <p className="font-display text-2xl font-bold tabular-nums text-ink-primary dark:text-white">
                {early.monthsSaved >= 12
                  ? t('loanCalc.early.yearsMonths', { years: Math.floor(early.monthsSaved / 12), months: early.monthsSaved % 12 })
                  : t('loanCalc.early.monthsValue', { count: early.monthsSaved })}
              </p>
            </div>
            <div className="rounded-container border border-surface-hairline dark:border-surface-dark-hairline p-5">
              <p className="text-label text-ink-muted dark:text-white/60 mb-1">{t('loanCalc.early.interestSaved')}</p>
              <p className="font-display text-2xl font-bold tabular-nums text-brand-600 dark:text-brand-400">
                {money(early.interestSaved)} <span className="text-sm font-medium text-ink-muted dark:text-white/50">{cur}</span>
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-label text-ink-muted dark:text-white/60">{t('loanCalc.early.none')}</p>
        )}
        <p className="mt-4 text-xs text-ink-muted dark:text-white/60 leading-relaxed max-w-lg">{t('loanCalc.early.note')}</p>
      </Panel>

      {/* ── Amortization schedule (collapsed) ──────────────────────────── */}
      <ScheduleTable rows={result.rows} currency={cur} t={t} />

      {/* ── Worked example — every number from the engine ──────────────── */}
      <Panel
        title={t('loanCalc.example.title', {
          amount: `${money(DEFAULTS.PRINCIPAL)} ALL`,
          rate: pct1(DEFAULTS.ANNUAL_RATE),
          years: t('loanCalc.inputs.termYears', { count: DEFAULTS.TERM_YEARS }),
        })}
      >
        <div className="space-y-3 text-body text-ink-muted dark:text-white/80 leading-relaxed">
          <p>
            {t('loanCalc.example.p1', {
              amount: `${money(DEFAULTS.PRINCIPAL)} ALL`,
              rate: pct1(DEFAULTS.ANNUAL_RATE),
              years: t('loanCalc.inputs.termYears', { count: DEFAULTS.TERM_YEARS }),
              payment: `${money(example.payment)} ALL`,
            })}
          </p>
          <p>
            {t('loanCalc.example.p2', {
              totalPaid: `${money(example.totalPaid)} ALL`,
              interest: `${money(example.totalInterest)} ALL`,
              share: pct0(example.share),
            })}
          </p>
        </div>
        <p className="mt-6 text-label text-ink-muted dark:text-white/60 leading-relaxed">
          {t('loanCalc.example.disclaimer')}
        </p>
      </Panel>

      {/* ── Bridge CTA ─────────────────────────────────────────────────── */}
      <div className="mt-10 pt-8 border-t border-surface-hairline dark:border-surface-dark-hairline">
        <p className="text-body text-ink-muted dark:text-white/80 mb-4 max-w-xl">{t('loanCalc.cta.text')}</p>
        <Link
          to={localizedPath('/register', i18n.language)}
          onClick={() =>
            // Carry the installment across the register/login journey so it lands
            // as a prefilled recurring expense once the user is in the app. The
            // installment is stored in its own currency; income tracking converts.
            savePendingLoanRecurring({
              amount: Math.round(result.payment),
              currency,
              title: t('loanCalc.cta.recurringTitle'),
            })
          }
          className="inline-flex items-center justify-center px-5 py-2.5 text-label font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors"
        >
          {t('loanCalc.cta.button')}
        </Link>
      </div>
    </div>
  );
}
