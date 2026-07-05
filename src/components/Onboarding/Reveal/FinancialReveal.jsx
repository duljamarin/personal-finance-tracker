import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../../utils/formatCurrency';
import { translateCategoryName } from '../../../utils/categoryTranslation';
import { trackEvent } from '../../../lib/analytics';
import Button from '../../UI/Button';
import ScoreGauge from './ScoreGauge';
import { useCountUp } from '../../../hooks/useCountUp';

const SLIDE_MS = 5200;

// Which slides to show depends on available data (income → projection/benchmark).
function buildSlides(snapshot) {
  const slides = ['score'];
  if (snapshot.hasIncome) {
    slides.push('projection');
    if (snapshot.opportunity) slides.push('benchmark');
  }
  slides.push('ready');
  return slides;
}

function CountCurrency({ value, currency, className, decimals = 0, start }) {
  const n = useCountUp(value, { duration: 1300, start });
  return <span className={className}>{formatCurrency(n, currency, { decimals })}</span>;
}

export default function FinancialReveal({ snapshot, currency, seededSummary, onDone }) {
  const { t } = useTranslation();
  const slides = useMemo(() => buildSlides(snapshot), [snapshot]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const current = slides[index];
  const isLast = index === slides.length - 1;

  useEffect(() => {
    trackEvent('RevealViewed');
  }, []);

  // Auto-advance unless paused or on the last slide.
  useEffect(() => {
    if (paused || isLast) return;
    timerRef.current = setTimeout(() => setIndex((i) => Math.min(i + 1, slides.length - 1)), SLIDE_MS);
    return () => clearTimeout(timerRef.current);
  }, [index, paused, isLast, slides.length]);

  const next = () => {
    if (isLast) {
      trackEvent('RevealCompleted');
      onDone();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-page dark:bg-surface-dark-page flex flex-col">
      {/* Progress segments */}
      <div className="flex gap-1.5 px-4 pt-4 sm:px-8">
        {slides.map((s, i) => (
          <div key={s} className="flex-1 h-1 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline overflow-hidden">
            <div
              className={`h-full bg-brand-600 transition-all ${i < index ? 'w-full' : i === index ? 'w-full' : 'w-0'}`}
              style={{ transitionDuration: i === index && !paused && !isLast ? `${SLIDE_MS}ms` : '300ms' }}
            />
          </div>
        ))}
      </div>

      {/* Slide viewport — click to advance, hold to pause */}
      <div
        className="flex-1 flex items-center justify-center px-6 select-none cursor-pointer"
        onClick={next}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <div key={current} className="w-full max-w-md text-center animate-fade-in">
          {current === 'score' && <SlideScore snapshot={snapshot} t={t} />}
          {current === 'projection' && <SlideProjection snapshot={snapshot} currency={currency} t={t} />}
          {current === 'benchmark' && <SlideBenchmark snapshot={snapshot} currency={currency} t={t} />}
          {current === 'ready' && (
            <SlideReady snapshot={snapshot} currency={currency} seededSummary={seededSummary} t={t} />
          )}
        </div>
      </div>

      {/* Footer action */}
      <div className="px-6 pb-8 flex justify-center">
        <Button
          onClick={next}
          className="min-w-[200px] shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30"
        >
          {isLast ? t('onboarding.reveal.goToDashboard') : t('onboarding.reveal.continue')}
        </Button>
      </div>
    </div>
  );
}

function SlideScore({ snapshot, t }) {
  return (
    <div className="space-y-6">
      <p className="eyebrow">{t('onboarding.reveal.scoreEyebrow')}</p>
      <div className="flex justify-center">
        <ScoreGauge score={snapshot.score} size={220} />
      </div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-primary dark:text-white">
        {t('onboarding.reveal.scoreTitle')}
      </h2>
      <p className="text-ink-muted dark:text-white/70">
        {snapshot.hasIncome
          ? t('onboarding.reveal.scoreSubtitle')
          : t('onboarding.reveal.scoreSubtitleNoIncome')}
      </p>
    </div>
  );
}

function SlideProjection({ snapshot, currency, t }) {
  const positive = snapshot.positive;
  const amount = Math.abs(snapshot.projectedAnnual);
  return (
    <div className="space-y-5">
      <p className="eyebrow">{t('onboarding.reveal.projectionEyebrow')}</p>
      <div
        className="font-display font-bold tracking-tight leading-none"
        style={{ fontSize: 'clamp(2.5rem, 12vw, 4rem)', color: positive ? '#168b78' : '#e8394d' }}
      >
        <CountCurrency value={amount} currency={currency} decimals={0} start />
      </div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-primary dark:text-white">
        {positive
          ? t('onboarding.reveal.projectionTitlePositive')
          : t('onboarding.reveal.projectionTitleNegative')}
      </h2>
      <p className="text-ink-muted dark:text-white/70">
        {positive
          ? t('onboarding.reveal.projectionSubPositive', {
              amount: formatCurrency(Math.abs(snapshot.monthlySavings), currency, { decimals: 0 }),
            })
          : t('onboarding.reveal.projectionSubNegative')}
      </p>
    </div>
  );
}

function SlideBenchmark({ snapshot, currency, t }) {
  const opp = snapshot.opportunity;
  const yourPct = Math.round(opp.yourShare * 100);
  const refPct = Math.round(opp.refShare * 100);
  const maxPct = Math.max(yourPct, refPct, 1);
  return (
    <div className="space-y-6">
      <p className="eyebrow">{t('onboarding.reveal.benchmarkEyebrow')}</p>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-primary dark:text-white">
        {translateCategoryName(opp.categoryName) || t(`onboarding.expenses.presets.${opp.bucket}`)}
      </h2>

      <div className="space-y-3 text-left">
        <BenchmarkBar label={t('onboarding.reveal.you')} pct={yourPct} maxPct={maxPct} color="#e8394d" />
        <BenchmarkBar label={t('onboarding.reveal.typical')} pct={refPct} maxPct={maxPct} color="#168b78" />
      </div>

      <p className="text-ink-muted dark:text-white/70">
        {t('onboarding.reveal.benchmarkOpportunity', {
          amount: formatCurrency(opp.potentialAnnual, currency, { decimals: 0 }),
        })}
      </p>
    </div>
  );
}

function BenchmarkBar({ label, pct, maxPct, color }) {
  const width = `${Math.min(100, (pct / maxPct) * 100)}%`;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-ink-primary dark:text-white">{label}</span>
        <span className="tabular-nums font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-3 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function SlideReady({ snapshot, currency, seededSummary, t }) {
  return (
    <div className="space-y-6">
      <div className="animate-celebrate inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-md shadow-lg shadow-brand-500/30">
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-primary dark:text-white">
        {t('onboarding.reveal.readyTitle')}
      </h2>

      {snapshot.hasIncome && snapshot.safeToSpendPerDay > 0 && (
        <p className="text-ink-muted dark:text-white/70">
          {t('onboarding.reveal.safeToSpend', {
            amount: formatCurrency(snapshot.safeToSpendPerDay, currency, { decimals: 0 }),
          })}
        </p>
      )}

      <ul className="text-left max-w-xs mx-auto space-y-2 text-sm text-ink-primary dark:text-white">
        {seededSummary.recurring > 0 && (
          <ReadyItem text={t('onboarding.reveal.seededRecurring', { count: seededSummary.recurring })} />
        )}
        {seededSummary.budgets > 0 && (
          <ReadyItem text={t('onboarding.reveal.seededBudgets', { count: seededSummary.budgets })} />
        )}
        <ReadyItem text={t('onboarding.reveal.seededForecast')} />
      </ul>
    </div>
  );
}

function ReadyItem({ text }) {
  return (
    <li className="flex items-start gap-2">
      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span>{text}</span>
    </li>
  );
}
