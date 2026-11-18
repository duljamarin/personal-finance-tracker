import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { delayStyle, tileDelay } from '../../utils/motion';
import { useTranslation } from 'react-i18next';
import { useMetaTags } from '../../hooks/useMetaTags';
import CustomSelect from '../UI/CustomSelect.jsx';
import { TOOLS_INDEX_PATH, toolPath, localizedPath } from '../../lib/tools';
import {
  fromGross,
  grossFromNet,
  grossFromEmployerCost,
  getConfig,
  AVAILABLE_YEARS,
  DEFAULT_YEAR,
} from '../../lib/tax/albaniaSalary.js';

/**
 * Albania salary calculator — public, unauthenticated.
 *
 * RULE: every number and percentage rendered here comes from the engine or the
 * year's config. No statutory literal is typed into JSX. The only literals are
 * UI affordances (slider bounds, preset chips, table rows).
 *
 * All copy goes through i18n — the tool is Albania-specific but the app is
 * bilingual, so an English speaker working in Albania gets the same content.
 */

// Slider, preset chips and table rows are UI affordances, not statutory figures.
const SLIDER_MAX = 500000;
const SLIDER_STEP = 1000;
const PRESETS = [50000, 80000, 100000, 150000, 200000, 300000];
const INITIAL_AMOUNT = 100000; // never arrive on an empty/zero panel
// Common Albanian monthly salaries. Spans the minimum wage up to above the
// social-insurance cap so the table shows the cap effect, not just the mid-band.
const TABLE_ROWS = [
  50000, 60000, 70000, 80000, 90000, 100000,
  120000, 150000, 180000, 200000, 250000, 300000,
];

const MODE_IDS = ['grossToNet', 'netToGross', 'costToGross'];

const fmt = new Intl.NumberFormat('sq-AL', { maximumFractionDigits: 0 });
const money = (n) => fmt.format(Math.round(n));
// Rates come from config as decimals; render them without a trailing ".0"
const pct = (rate) => `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`;

function parseAmount(raw) {
  const digits = String(raw).replace(/[^\d]/g, ''); // drops separators, minus, letters
  if (!digits) return 0;
  return Math.min(Number(digits), 99999999);
}

/** Segmented control — an accessible radio group with arrow-key navigation. */
function ModeToggle({ mode, onChange, t }) {
  const refs = useRef({});

  function onKeyDown(e) {
    const i = MODE_IDS.indexOf(mode);
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % MODE_IDS.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + MODE_IDS.length) % MODE_IDS.length;
    if (next === null) return;
    e.preventDefault();
    onChange(MODE_IDS[next]);
    refs.current[MODE_IDS[next]]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('salaryCalc.modeLabel')}
      onKeyDown={onKeyDown}
      className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto p-1 gap-1 rounded-input bg-inner border border-line"
    >
      {MODE_IDS.map((id) => {
        const active = id === mode;
        return (
          <button
            key={id}
            ref={(el) => { refs.current[id] = el; }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(id)}
            className={`min-w-0 px-1.5 sm:px-4 py-2 text-min sm:text-label rounded-input transition-colors whitespace-nowrap ${
 active
 ? 'bg-brand-600 text-white font-semibold'
 : 'text-fg hover:text-ink-primary dark:hover:text-white'
 }`}
          >
            {t(`salaryCalc.modes.${id}`)}
          </button>
        );
      })}
    </div>
  );
}

/** One line of the breakdown. `emphasis` marks the net/total row. */
function Row({ label, value, sign, emphasis = false, muted = false }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2.5 ${
        emphasis ? 'border-t border-white/30 pt-3.5 mt-1' : ''
      }`}
    >
      <span className={`text-body ${emphasis ? 'font-extrabold' : muted ? 'font-medium' : 'font-semibold'}`}>
        {label}
      </span>
      <span className={`tabular-nums whitespace-nowrap ${emphasis ? 'text-h3 font-extrabold' : 'text-body font-bold'}`}>
        {sign === '-' && <span className="mr-0.5">−</span>}
        {money(value)}
      </span>
    </div>
  );
}

/** Thin stacked bar: gross split into net / tax / contributions. No chart lib. */
function SplitBar({ b, t }) {
  const parts = [
    // On the hero tile: net white, tax from the palette, contributions on the inset.
    { w: b.net / b.gross, cls: 'bg-white', label: t('salaryCalc.legend.net') },
    { w: b.incomeTax / b.gross, cls: 'bg-data-sand', label: t('salaryCalc.legend.tax') },
    { w: b.employeeContribTotal / b.gross, cls: 'bg-hero-inset', label: t('salaryCalc.legend.contrib') },
  ];
  return (
    <div className="mt-6">
      <div className="flex gap-[3px] h-[18px] rounded-pill overflow-hidden">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${p.w * 100}%` }} className={p.cls} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <span className={`w-2.5 h-2.5 rounded-swatch ${p.cls}`} aria-hidden="true" />
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Gross-to-net reference table. Every cell is an engine call — nothing here is
 * a stored or hand-typed figure, so the table can never drift from the
 * calculator above it. Rows are clickable: they load the value and switch to
 * gross mode, which is the natural next action after scanning the table.
 */
function SalaryTable({ year, onPick, t }) {
  const rows = useMemo(
    () => TABLE_ROWS.map((g) => fromGross(g, year)),
    [year]
  );

  return (
    <section className="mt-12 pt-10 border-t border-line">
      <h2 className="font-display text-heading text-fg mb-2">
        {t('salaryCalc.table.title')}
      </h2>
      <p className="text-body text-fg mb-5">
        {t('salaryCalc.table.desc', { year })}
      </p>

      {/* Wide table scrolls inside its own container so the page never scrolls sideways */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="text-left py-2.5 pr-3 text-label font-medium text-fg">
                {t('salaryCalc.table.gross')}
              </th>
              <th scope="col" className="text-right py-2.5 px-3 text-label font-medium text-fg">
                {t('salaryCalc.table.tax')}
              </th>
              <th scope="col" className="text-right py-2.5 px-3 text-label font-medium text-fg">
                {t('salaryCalc.table.contrib')}
              </th>
              <th scope="col" className="text-right py-2.5 px-3 text-label font-semibold text-fg">
                {t('salaryCalc.table.net')}
              </th>
              <th scope="col" className="text-right py-2.5 pl-3 text-label font-medium text-fg">
                {t('salaryCalc.table.employerCost')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.gross}
                onClick={() => onPick(r.gross)}
                tabIndex={0}
                role="button"
                aria-label={`${t('salaryCalc.table.srUse')}: ${money(r.gross)}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPick(r.gross);
                  }
                }}
                className="border-b border-line last:border-0 cursor-pointer transition-colors hover:bg-inner focus:bg-surface-subtle dark:focus:bg-surface-dark-subtle"
              >
                <td className="py-2.5 pr-3 text-body tabular-nums font-medium text-fg">
                  {money(r.gross)}
                </td>
                <td className="py-2.5 px-3 text-body tabular-nums text-right text-fg">
                  {money(r.incomeTax)}
                </td>
                <td className="py-2.5 px-3 text-body tabular-nums text-right text-fg">
                  {money(r.employeeContribTotal)}
                </td>
                <td className="py-2.5 px-3 text-body tabular-nums text-right font-semibold text-fg">
                  {money(r.net)}
                </td>
                <td className="py-2.5 pl-3 text-body tabular-nums text-right text-fg">
                  {money(r.employerCost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Explains which mode answers which real-world question. */
function WhenToUse({ t }) {
  const cases = [
    { key: 'knowGross', mode: 'grossToNet' },
    { key: 'knowNet', mode: 'netToGross' },
    { key: 'knowCost', mode: 'costToGross' },
  ];
  return (
    <section className="mt-12 pt-10 border-t border-line">
      <h2 className="font-display text-heading text-fg mb-5">
        {t('salaryCalc.whenToUse.title')}
      </h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {cases.map(({ key, mode }) => (
          <div key={key} className="tile-inner p-gap">
            <h3 className="text-body font-semibold text-fg mb-1">
              {t(`salaryCalc.whenToUse.${key}Title`)}
            </h3>
            <p className="text-label text-fg leading-relaxed mb-2">
              {t(`salaryCalc.whenToUse.${key}Desc`)}
            </p>
            <span className="inline-block text-sm font-medium tabular-nums text-brand-text">
              {t(`salaryCalc.modes.${mode}`)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SalaryCalculator() {
  const { t, i18n } = useTranslation();
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [mode, setMode] = useState('grossToNet');
  const [amount, setAmount] = useState(INITIAL_AMOUNT); // prefilled: never an empty panel

  const config = getConfig(year);
  const currency = t('salaryCalc.currency');

  const metaTitle = `${t('salaryCalc.metaTitle', { year: config.YEAR })} | Personal Finances`;
  const metaDescription = t('salaryCalc.metaDescription', { year: config.YEAR });
  useMetaTags({
    title: metaTitle,
    description: metaDescription,
    canonical: `https://personal-finances.app${toolPath('/tools/salary-calculator', i18n.language)}`,
    hreflangs: [
      { lang: 'en', href: 'https://personal-finances.app/tools/salary-calculator' },
      { lang: 'sq', href: 'https://personal-finances.app/sq/tools/salary-calculator' },
      { lang: 'x-default', href: 'https://personal-finances.app/tools/salary-calculator' },
    ],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: t('salaryCalc.metaTitle', { year: config.YEAR }),
        url: `https://personal-finances.app${toolPath('/tools/salary-calculator', i18n.language)}`,
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
            name: t('salaryCalc.metaTitle', { year: config.YEAR }),
            item: `https://personal-finances.app${toolPath('/tools/salary-calculator', i18n.language)}`,
          },
        ],
      },
    ],
  });

  /**
   * One breakdown object feeds the whole panel. For the reverse modes we
   * resolve gross first via the relevant closed-form inverse, then call
   * fromGross — so every mode renders from identical, consistent fields.
   */
  const breakdown = useMemo(() => {
    if (amount <= 0) return null;
    let gross = amount;
    if (mode === 'netToGross') gross = grossFromNet(amount, year);
    if (mode === 'costToGross') gross = grossFromEmployerCost(amount, year);
    if (!Number.isFinite(gross) || gross <= 0) return null;
    return fromGross(gross, year);
  }, [amount, mode, year]);

  // Worked example is always computed by the engine, never typed text.
  const example = useMemo(() => fromGross(INITIAL_AMOUNT, year), [year]);

  const headline = breakdown
    ? mode === 'grossToNet' ? breakdown.net : breakdown.gross
    : 0;

  // Count-up on recalculation (spec 4.6), tweening from the shown value.
  const headlineShown = useCountUp(headline);

  const effectiveRate = breakdown && breakdown.gross > 0
    ? (breakdown.incomeTax + breakdown.employeeContribTotal) / breakdown.gross
    : 0;

  // A reverse target that lands below the contribution floor isn't a normal
  // salary — say so instead of presenting it as one.
  const belowMinimum =
    breakdown && mode !== 'grossToNet' && breakdown.gross < config.CONTRIB.BASE_MIN;

  const yearOptions = AVAILABLE_YEARS.map((y) => ({ value: String(y), label: String(y) }));

  // Picking a row from the table means "show me this gross salary".
  function pickFromTable(gross) {
    setMode('grossToNet');
    setAmount(gross);
    document.getElementById('salary-amount')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="max-w-3xl mx-auto py-10 sm:py-16">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <Link to={toolPath(TOOLS_INDEX_PATH, i18n.language)} className="group btn-motion inline-flex items-center gap-1.5 min-h-11 px-3.5 -ml-3.5 mb-2 rounded-pill text-sm font-bold text-brand-text hover:bg-inner">
          <ArrowLeft className="w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
          {t('salaryCalc.eyebrow')}
        </Link>
        <h1 className="text-h1-lg font-extrabold text-fg mb-3">
          {t('salaryCalc.title', { year: config.YEAR })}
        </h1>
        <p className="text-body text-fg leading-relaxed max-w-xl">
          {t('salaryCalc.intro', { year: config.YEAR })}
        </p>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div className="tile p-tile-dense sm:p-tile animate-pop">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <ModeToggle mode={mode} onChange={setMode} t={t} />
          {/* Static text at one year, a real dropdown at two or more. */}
          {AVAILABLE_YEARS.length > 1 ? (
            <div className="w-full sm:w-28">
              <CustomSelect
                value={String(year)}
                onChange={(v) => setYear(Number(v))}
                options={yearOptions}
                ariaLabel={t('salaryCalc.taxYear')}
              />
            </div>
          ) : (
            <span className="text-label text-fg tabular-nums">
              {t('salaryCalc.taxYearWithValue', { year: config.LABEL })}
            </span>
          )}
        </div>

        {/* Amount input with a currency suffix affix */}
        <label htmlFor="salary-amount" className="block text-label font-medium text-fg mb-2">
          {t(`salaryCalc.amountLabel.${mode}`)}
        </label>
        <div className="relative">
          <input
            id="salary-amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={amount ? fmt.format(amount) : ''}
            onChange={(e) => setAmount(parseAmount(e.target.value))}
            className="w-full py-3 pl-4 pr-16 text-[36px] leading-tight font-extrabold tabular-nums tracking-[-0.02em] bg-tile text-fg border-2 border-line rounded-input btn-motion hover:border-inner-2 focus:border-brand-600 dark:focus:border-brand-400"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-body font-bold text-fg pointer-events-none">
            {currency}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          value={Math.min(amount, SLIDER_MAX)}
          onChange={(e) => setAmount(Number(e.target.value))}
          aria-label={t(`salaryCalc.amountLabel.${mode}`)}
          className="w-full mt-5 accent-brand-600 dark:accent-brand-400 cursor-pointer"
        />

        <div className="flex flex-wrap gap-2 mt-5">
          {PRESETS.map((p) => {
            const selected = amount === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                aria-pressed={selected}
                className={`btn-motion chip-lift min-h-11 px-4 text-sm font-bold rounded-pill border-2 tabular-nums ${
                  selected
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-tile border-line text-fg hover:border-inner-2'
                }`}
              >
                {money(p / 1000)}K
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Result ─────────────────────────────────────────────────────── */}
      {breakdown && (
        <div className="mt-gap tile tile-hero p-tile-dense sm:p-tile animate-pop" style={delayStyle(tileDelay(1))} aria-live="polite">
          <p className="text-sm font-bold mb-1">
            {t(`salaryCalc.headlineLabel.${mode}`)}
          </p>
          <p className="text-kpi font-extrabold tabular-nums">
            {money(headlineShown)}
            <span className="text-h3 font-bold ml-2">{currency}</span>
          </p>

          {belowMinimum && (
            <p className="mt-4 inline-block rounded-inner bg-white px-3 py-2 text-sm font-bold text-warning">
              {t('salaryCalc.belowMinimum', { amount: money(config.CONTRIB.BASE_MIN) })}
            </p>
          )}

          <div className="mt-6">
            <Row label={t('salaryCalc.rows.gross')} value={breakdown.gross} />
            <Row label={t('salaryCalc.rows.incomeTax')} value={breakdown.incomeTax} sign="-" />
            <Row
              label={t('salaryCalc.rows.social', { rate: pct(config.CONTRIB.EMPLOYEE_SOCIAL) })}
              value={breakdown.employeeSocial}
              sign="-"
            />
            <Row
              label={t('salaryCalc.rows.health', { rate: pct(config.CONTRIB.EMPLOYEE_HEALTH) })}
              value={breakdown.employeeHealth}
              sign="-"
            />
            <Row label={t('salaryCalc.rows.net')} value={breakdown.net} emphasis />

            {mode === 'costToGross' && (
              <>
                <Row
                  label={t('salaryCalc.rows.employerContrib', {
                    rate: pct(config.CONTRIB.EMPLOYER_SOCIAL + config.CONTRIB.EMPLOYER_HEALTH),
                  })}
                  value={breakdown.employerContribTotal}
                  muted
                />
                <Row label={t('salaryCalc.rows.employerCost')} value={breakdown.employerCost} emphasis />
              </>
            )}
          </div>

          <p className="mt-4 text-sm font-semibold">
            {t('salaryCalc.effectiveRate')}{' '}
            <span className="tabular-nums font-extrabold">{pct(effectiveRate)}</span>
          </p>

          <SplitBar b={breakdown} t={t} />
        </div>
      )}

      {/* ── When to use which mode ─────────────────────────────────────── */}
      <WhenToUse t={t} />

      {/* ── Reference table (every cell an engine call) ─────────────────── */}
      <SalaryTable year={year} onPick={pickFromTable} t={t} />

      {/* ── Worked example — every value from the engine ────────────────── */}
      <section className="mt-12 pt-10 border-t border-line">
        <h2 className="font-display text-heading text-fg mb-4">
          {t('salaryCalc.example.title', { gross: money(example.gross) })}
        </h2>
        <div className="space-y-3 text-body text-fg leading-relaxed">
          <p>{t('salaryCalc.example.p1', { gross: money(example.gross), tax: money(example.incomeTax) })}</p>
          <p>
            {t('salaryCalc.example.p2', {
              socialRate: pct(config.CONTRIB.EMPLOYEE_SOCIAL),
              social: money(example.employeeSocial),
              healthRate: pct(config.CONTRIB.EMPLOYEE_HEALTH),
              health: money(example.employeeHealth),
              contribTotal: money(example.employeeContribTotal),
            })}
          </p>
          <p>
            {t('salaryCalc.example.p3', {
              gross: money(example.gross),
              tax: money(example.incomeTax),
              contribTotal: money(example.employeeContribTotal),
              net: money(example.net),
            })}
          </p>
          <p>
            {t('salaryCalc.example.p4', {
              employerContrib: money(example.employerContribTotal),
              employerCost: money(example.employerCost),
            })}
          </p>
          <p className="text-label text-fg pt-2">
            {t('salaryCalc.example.capNote', { cap: money(config.CONTRIB.BASE_MAX) })}
          </p>
        </div>

        <p className="mt-6 text-label text-fg leading-relaxed">
          {t('salaryCalc.disclaimer', { year: config.YEAR })}
        </p>
      </section>

      <div className="mt-10 pt-8 border-t border-line">
        <p className="text-body text-fg mb-4">
          {t('salaryCalc.ctaText')}
        </p>
        <Link
          to={localizedPath('/register', i18n.language)}
          className="group btn-motion btn-lift inline-flex items-center justify-center min-h-11 px-6 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-pill"
        >
          {t('salaryCalc.ctaButton')}
        </Link>
      </div>
    </div>
  );
}
