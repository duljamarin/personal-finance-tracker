import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMetaTags } from '../hooks/useMetaTags';
import { TOOLS, toolPath, localizedPath } from '../lib/tools';
import {
  TrendingUp, Target, Activity, RefreshCw,
  Globe, Bell, Tag, FileText,
  ArrowRight, CheckCircle2, Lock, ShieldCheck, CloudOff,
  Download, CreditCard, ChevronDown, ChevronUp,
  Database, Eye,
} from 'lucide-react';


// ── Scroll-reveal hook ──────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setVisible(true); return; }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

// ── Bar chart mini-render (replaces FlagshipCard) ───────────────────────────
const MONTHS_SHORT = ['J','F','M','A','M','J','J','A','S','O','N','D'];
const INCOME_BARS  = [3200,3200,3400,3200,3600,3200,3500,3200,3400,3200,3600,3800];
const EXPENSE_BARS = [1600,1900,1500,2100,1700,1400,1800,1500,1650,1300,1750,1400];
const BAR_MAX = 4000;

// One bar per month, sized by that month's income. A month is "heavy" when
// expenses eat a large share of income (>=52%): those bars render in the app's
// expense-red to flag high-spend months at a glance; lighter months stay
// brand-teal. Single bars (not stacked) keep every column inside the fixed
// height, so the red heavy-months are always visible.
const HEAVY_SPEND_RATIO = 0.52;

function MiniBarChart() {
  return (
    <div className="flex items-end gap-[3px] sm:gap-1 h-20 w-full">
      {MONTHS_SHORT.map((m, i) => {
        const heavy = EXPENSE_BARS[i] / INCOME_BARS[i] >= HEAVY_SPEND_RATIO;
        return (
          <div key={m} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div
              className={`w-full rounded-t-[2px] ${heavy ? 'bg-expense' : 'bg-brand-600'}`}
              style={{ height: `${(INCOME_BARS[i] / BAR_MAX) * 100}%` }}
            />
            <span className="text-[8px] text-ink-muted dark:text-white hidden sm:block">{m}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Health score mini-render ─────────────────────────────────────────────────
function MiniHealthScore() {
  const { t } = useTranslation();
  const score = 70;
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-hairline dark:text-surface-dark-hairline" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke="var(--c-brand-accent)" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-ink-primary dark:text-white metric">{score}</span>
          <span className="text-[10px] font-medium text-brand-600 dark:text-brand-400">{t('landing.demo.scoreGood')}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full text-center text-[10px] text-ink-muted dark:text-white">
        <div><div className="font-semibold text-sm text-ink-primary dark:text-white">42%</div>{t('landing.demo.savings')}</div>
        <div><div className="font-semibold text-sm text-ink-primary dark:text-white">87%</div>{t('landing.demo.budget')}</div>
        <div><div className="font-semibold text-sm text-ink-primary dark:text-white">3/4</div>{t('landing.demo.goals')}</div>
      </div>
    </div>
  );
}

// ── Mini budget bars ─────────────────────────────────────────────────────────
function MiniBudgets() {
  const { t } = useTranslation();
  const items = [
    { key: 'food', spent: 210, limit: 300 },
    { key: 'housing', spent: 850, limit: 900 },
    { key: 'entertainment', spent: 47, limit: 50 },
    { key: 'transport', spent: 28, limit: 80 },
  ];
  return (
    <div className="space-y-3 py-2">
      {items.map(({ key, spent, limit }) => {
        const label = t(`landing.demo.budgetItems.${key}`);
        const pct = Math.min((spent / limit) * 100, 100);
        const over = spent > limit;
        return (
          <div key={key}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-medium text-ink-primary dark:text-white truncate">{label}</span>
              <span className={over ? 'text-expense font-semibold' : 'text-ink-muted dark:text-white'}>
                €{spent}<span className="opacity-50">/€{limit}</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: over ? 'var(--c-expense)' : 'var(--c-brand-accent)' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Mini benchmarks card ──────────────────────────────────────────────────────
// Mirrors what computeCategoryBenchmarks actually returns: this month's spend
// per category measured against THAT USER's own trailing average, as a signed
// deviation. Deliberately not a comparison against other people — the app holds
// no population data and the page must not imply otherwise.
const BENCHMARK_ROWS = [
  { key: 'food',          now: 412, avg: 350 },
  { key: 'transport',     now: 58,  avg: 90  },
  { key: 'entertainment', now: 96,  avg: 70  },
  { key: 'housing',       now: 850, avg: 850 },
];

function MiniBenchmarks() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 py-2">
      {BENCHMARK_ROWS.map(({ key, now, avg }) => {
        const delta = now - avg;
        const pct = avg === 0 ? 0 : Math.round((delta / avg) * 100);
        const above = delta > 0;
        // Bar is centred: the midpoint is the user's own average, so bar length
        // encodes how far this month deviates, in either direction.
        const width = Math.min(Math.abs(pct), 100) / 2;
        return (
          <div key={key}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-medium text-ink-primary dark:text-white truncate">
                {t(`landing.demo.budgetItems.${key}`)}
              </span>
              <span className={`tabular-nums font-semibold ${above ? 'text-expense' : 'text-brand-600 dark:text-brand-400'}`}>
                {pct === 0 ? '0%' : `${above ? '+' : ''}${pct}%`}
              </span>
            </div>
            <div className="relative h-1.5 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline overflow-hidden">
              {/* centre line marks the user's own average */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-ink-muted/40 dark:bg-white/30" />
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  width: `${width}%`,
                  [above ? 'left' : 'right']: '50%',
                  backgroundColor: above ? 'var(--c-expense)' : 'var(--c-brand-accent)',
                }}
              />
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-[10px] text-ink-muted dark:text-white">
        {t('landing.demo.vsLastMonth')}
      </p>
    </div>
  );
}

// ── Hero visual ──────────────────────────────────────────────────────────────
// The metaphor the whole page rests on: tangled threads (a spreadsheet, a bank
// feed) resolving into ordered parallel lines. Decorative, so alt="" keeps it
// out of the accessibility tree — the H1 beside it already carries the meaning.
//
// The source art is a wide 16:9 with the composition weighted left and generous
// empty margins, so it is cropped to a shorter band and anchored left rather
// than letterboxed with dead space.
function HeroVisual() {
  // A missing/failed art file renders nothing rather than a broken-image icon:
  // the hero still reads perfectly without it.
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    /* The wrapper paints the page colour explicitly: mix-blend-screen
       composites against the nearest painted backdrop, and without one the
       image's black field stayed visible as a faint rectangle. */
    <div
      className="animate-hero-in mt-12 sm:mt-16 max-w-5xl mx-auto bg-surface-page dark:bg-surface-dark-page"
      style={{ animationDelay: '440ms' }}
      aria-hidden="true"
    >
      {/* The art is dark green strokes on a baked-in light #FAFAF7 field.
          In light mode that field matches the page exactly, so the image drops
          in as-is. In dark mode it would be a bright slab, so the whole image is
          inverted (light field -> near-black, matching the page) and the hue is
          rotated back so the strokes stay green rather than becoming magenta.
          One asset, no second file to keep in sync. */}
      <img
        src="/ads/threads-order-from-chaos.webp"
        alt=""
        width={1672}
        height={941}
        // Above the fold, so it must not be lazy: it competes with the H1 for
        // LCP and a late load would shift the sections below.
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onError={() => setFailed(true)}
        // `screen` on the inverted image drops its near-black field into the
        // page (black is the identity for screen), removing the faint rectangle
        // that invert alone leaves behind against #0A0A0B.
        className="w-full h-[150px] sm:h-[210px] lg:h-[250px] object-cover object-left dark:invert dark:hue-rotate-180 dark:brightness-110 dark:mix-blend-screen"
      />
    </div>
  );
}

// ── Feature card shell (hero features) ───────────────────────────────────────
function FeatureCard({ eyebrow, title, desc, preview, className = '', flip = false }) {
  const [ref, visible] = useReveal(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} grid lg:grid-cols-2 gap-0 rounded-[10px] border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card overflow-hidden ${className}`}
    >
      <div className={`p-8 sm:p-10 flex flex-col justify-center ${flip ? 'lg:order-2' : ''}`}>
        <p className="text-[13px] font-medium text-ink-muted dark:text-white mb-3">{eyebrow}</p>
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink-primary dark:text-white leading-tight mb-4">{title}</h3>
        <p className="text-base font-normal text-ink-muted dark:text-white leading-relaxed">{desc}</p>
      </div>
      <div className={`border-t lg:border-t-0 ${flip ? 'lg:order-1 lg:border-r' : 'lg:border-l'} border-surface-hairline dark:border-surface-dark-hairline bg-surface-page dark:bg-surface-dark-page p-8 flex flex-col justify-center`}>
        {preview}
      </div>
    </div>
  );
}

// ── Compact secondary feature item ───────────────────────────────────────────
function SecondaryItem({ icon: Icon, text }) {
  return (
    <li className="flex items-start gap-3 py-3 border-b border-surface-hairline dark:border-surface-dark-hairline last:border-0">
      <Icon className="flex-shrink-0 w-4 h-4 mt-0.5 text-ink-muted dark:text-white/60" strokeWidth={1.75} />
      <span className="text-sm text-ink-primary dark:text-white leading-relaxed">{text}</span>
    </li>
  );
}

// ── Privacy card ──────────────────────────────────────────────────────────────
function PrivacyCard({ icon: Icon, title, desc }) {
  return (
    <div className="flex gap-3.5">
      <Icon className="flex-shrink-0 w-5 h-5 mt-0.5 text-ink-muted dark:text-white/60" strokeWidth={1.6} />
      <div>
        {/* h3, not h4: the enclosing section heading is an h2, so h4 would
            skip a level. Visual size is set by the classes, not the tag. */}
        <h3 className="font-semibold text-sm text-ink-primary dark:text-white mb-1">{title}</h3>
        <p className="text-sm text-ink-muted dark:text-white leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── FAQ item ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-surface-hairline dark:border-surface-dark-hairline last:border-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="font-medium text-base text-ink-primary dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" strokeWidth={2} />
          : <ChevronDown className="w-4 h-4 text-ink-muted dark:text-white flex-shrink-0" strokeWidth={2} />
        }
      </button>
      {open && (
        <p className="pb-5 text-base font-normal text-ink-muted dark:text-white leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function Eyebrow({ children }) {
  return (
    <p className="text-sm font-semibold text-brand-700 dark:text-brand-300 mb-4">{children}</p>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ children, className = '' }) {
  return (
    <h2 className={`font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-ink-primary dark:text-white leading-[1.03] tracking-[-0.03em] ${className}`}>
      {children}
    </h2>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single source for the FAQ: the rendered accordion and the FAQPage JSON-LD
// both map over this, so structured data can never drift from what a visitor
// actually sees (which is what Google penalises).
const FAQ_KEYS = ['free', 'albanian', 'howLong', 'encrypted', 'switch', 'advice', 'multidevice', 'cancel'];

const LANDING_HREFLANGS = [
  { lang: 'en', href: 'https://personal-finances.app/' },
  { lang: 'sq', href: 'https://personal-finances.app/sq' },
  { lang: 'x-default', href: 'https://personal-finances.app/' },
];

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const isSq = (i18n.language || '').toLowerCase().startsWith('sq');

  // FAQPage + SoftwareApplication, both generated from the same i18n keys the
  // page renders, so structured data cannot drift from visible content. No
  // aggregateRating: there are no real ratings to report. Memoised so the
  // useMetaTags effect does not re-inject the scripts on every render.
  const jsonLd = useMemo(() => {
    const url = isSq ? 'https://personal-finances.app/sq' : 'https://personal-finances.app/';
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_KEYS.map((key) => ({
          '@type': 'Question',
          name: t(`landing.faq.items.${key}.q`),
          acceptedAnswer: { '@type': 'Answer', text: t(`landing.faq.items.${key}.a`) },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Personal Finance Tracker',
        url,
        description: t('meta.description'),
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        inLanguage: isSq ? 'sq' : 'en',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      },
    ];
  }, [t, isSq]);

  useMetaTags({
    title: t('meta.title'),
    description: t('meta.description'),
    canonical: isSq ? 'https://personal-finances.app/sq' : 'https://personal-finances.app/',
    hreflangs: LANDING_HREFLANGS,
    jsonLd,
  });

  // ── Hero ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden bg-surface-page dark:bg-surface-dark-page"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-28">
          {/* Copy — no scroll-reveal on hero: LCP element must be visible immediately */}
          <div className="max-w-3xl mx-auto text-center">
            <h1
              className="animate-hero-in font-display text-[3.25rem] sm:text-6xl lg:text-[4.5rem] font-bold text-ink-primary dark:text-white leading-[0.98] tracking-[-0.035em] mb-6"
              style={{ animationDelay: '40ms' }}
            >
              {t('landing.hero.titleLine1')}{' '}
              <span className="text-brand-600 dark:text-brand-accent">{t('landing.hero.titleAccent')}</span>
            </h1>

            <p
              className="animate-hero-in text-lg sm:text-xl font-normal text-ink-muted dark:text-white leading-relaxed mb-8 max-w-xl mx-auto"
              style={{ animationDelay: '140ms' }}
            >
              {t('landing.hero.subtitle')}
            </p>

            <div className="animate-hero-in flex flex-col sm:flex-row sm:items-center justify-center gap-3 mb-8" style={{ animationDelay: '240ms' }}>
              <Link
                to={localizedPath('/register', i18n.language)}
                className="group w-full sm:w-auto sm:min-w-[200px] inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-md transition-colors text-base"
              >
                {t('landing.hero.getStarted')}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
              </Link>
              {/* Sign-in matches the primary button's geometry so the pair sits
                  on one optical line, but stays outlined: only the fill marks
                  the primary action. */}
              <Link
                to={localizedPath('/login', i18n.language)}
                className="w-full sm:w-auto sm:min-w-[200px] inline-flex items-center justify-center px-7 py-3.5 text-base font-medium rounded-md border border-surface-outline dark:border-white/25 text-ink-primary dark:text-white hover:bg-surface-subtle dark:hover:bg-white/5 hover:border-ink-muted/50 dark:hover:border-white/40 transition-colors"
              >
                {t('landing.hero.signIn')}
              </Link>
            </div>

            <div className="animate-hero-in flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-ink-muted dark:text-white" style={{ animationDelay: '340ms' }}>
              {[t('landing.hero.trust1'), t('landing.hero.trust2'), t('landing.hero.trust3')].map((label) => (
                <span key={label} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 flex-shrink-0" strokeWidth={2.5} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Visual restatement of the promise: chaos resolving into order. */}
          <HeroVisual />
        </div>
      </section>

      {/* ── HERO FEATURES ────────────────────────────────────────────────────── */}
      <HeroFeaturesSection t={t} />

      {/* ── SECONDARY FEATURES ───────────────────────────────────────────────── */}
      <SecondaryFeaturesSection t={t} />

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <HowItWorksSection t={t} />

      {/* ── TRUST / PRIVACY ──────────────────────────────────────────────────── */}
      {/* Both trust sections sit together: encryption proof first, then the
          wider data-handling promises. Order is value > proof > how > trust >
          price > founder > FAQ > tools > final CTA. */}
      <DataPrivacySection t={t} />

      <PrivacySection t={t} />

      {/* ── PRICING PREVIEW ──────────────────────────────────────────────────── */}
      <PricingPreviewSection t={t} />

      {/* ── FOUNDER NOTE ─────────────────────────────────────────────────────── */}
      <FounderSection t={t} />

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <FaqSection t={t} />

      {/* ── FREE TOOLS ───────────────────────────────────────────────────────── */}
      <ToolsSection t={t} />

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <FinalCtaSection t={t} lang={i18n.language} />

    </div>
  );
}

// ── Section components ────────────────────────────────────────────────────────

function HeroFeaturesSection({ t }) {
  // returnObjects can yield the key string before the i18n bundle resolves
  // (first language switch). Coerce to an object so nested access never throws.
  const raw = t('landing.heroFeatures', { returnObjects: true });
  const feats = (raw && typeof raw === 'object') ? raw : {};
  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <Eyebrow>{t('landing.features.eyebrow')}</Eyebrow>
          <SectionHeading className="max-w-2xl">
            {t('landing.features.heading')}
          </SectionHeading>
        </div>

        <div className="space-y-5">
          {/* Strongest proof first: the score is the differentiator, so it is
              the first thing after the hero. */}
          <FeatureCard
            eyebrow={feats.healthscore?.eyebrow}
            title={feats.healthscore?.title}
            desc={feats.healthscore?.desc}
            preview={<MiniHealthScore />}
          />

          <FeatureCard
            eyebrow={feats.benchmarks?.eyebrow}
            title={feats.benchmarks?.title}
            desc={feats.benchmarks?.desc}
            flip
            preview={<MiniBenchmarks />}
          />

          <FeatureCard
            eyebrow={feats.budgets?.eyebrow}
            title={feats.budgets?.title}
            desc={feats.budgets?.desc}
            preview={<MiniBudgets />}
          />

          <FeatureCard
            eyebrow={feats.tracking?.eyebrow}
            title={feats.tracking?.title}
            desc={feats.tracking?.desc}
            flip
            preview={
              <div>
                <div className="flex justify-between items-center mb-4 text-xs font-medium text-ink-muted dark:text-white">
                  <span>{t('landing.demo.yearToDate')}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-600 inline-block" />{t('landing.demo.onTrack')}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-expense" />{t('landing.demo.highSpend')}</span>
                  </div>
                </div>
                <MiniBarChart />
                <div className="flex gap-5 mt-5 pt-4 border-t border-surface-hairline dark:border-surface-dark-hairline">
                  <div>
                    <p className="text-[11px] font-medium text-ink-muted dark:text-white mb-0.5">{t('landing.demo.income')}</p>
                    <p className="text-xl font-bold text-brand-600 dark:text-brand-400 tabular-nums">€{(INCOME_BARS.reduce((s,v)=>s+v,0)/1000).toFixed(1)}k</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-ink-muted dark:text-white mb-0.5">{t('landing.demo.expenses')}</p>
                    <p className="text-xl font-bold tabular-nums text-expense">€{(EXPENSE_BARS.reduce((s,v)=>s+v,0)/1000).toFixed(1)}k</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-ink-muted dark:text-white mb-0.5">{t('landing.demo.saved')}</p>
                    <p className="text-xl font-bold text-ink-primary dark:text-white tabular-nums">+€{((INCOME_BARS.reduce((s,v)=>s+v,0) - EXPENSE_BARS.reduce((s,v)=>s+v,0))/1000).toFixed(1)}k</p>
                  </div>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}

function SecondaryFeaturesSection({ t }) {
  const [ref, visible] = useReveal(0.1);
  // Keys here must match landing.secondaryFeatures.items in both locales.
  const items = [
    { icon: RefreshCw,  key: 'recurring' },
    { icon: Target,     key: 'goals' },
    { icon: TrendingUp, key: 'networth' },
    { icon: FileText,   key: 'reports' },
    { icon: Bell,       key: 'notifications' },
    { icon: Download,   key: 'csvImport' },
    { icon: Tag,        key: 'categories' },
    { icon: Globe,      key: 'albanian' },
    { icon: Activity,   key: 'currency' },
    { icon: Lock,       key: 'encryption' },
  ];
  return (
    <section className="py-16 sm:py-20 border-y border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card">
      <div
        ref={ref}
        className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <div className="mb-10">
          <Eyebrow>{t('landing.secondaryFeatures.title')}</Eyebrow>
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 list-none m-0 p-0">
          {items.map(({ icon, key }) => (
            <SecondaryItem
              key={key}
              icon={icon}
              text={t(`landing.secondaryFeatures.items.${key}`)}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorksSection({ t }) {
  const [ref, visible] = useReveal(0.1);
  const steps = [
    { num: 1, key: 'step1' },
    { num: 2, key: 'step2' },
    { num: 3, key: 'step3' },
  ];
  return (
    <section className="py-24 sm:py-32 bg-surface-page dark:bg-surface-dark-page">
      <div
        ref={ref}
        className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <div className="mb-16">
          <Eyebrow>{t('landing.howItWorks.title')}</Eyebrow>
          <SectionHeading>{t('landing.howItWorks.subtitle')}</SectionHeading>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map(({ num, key }) => (
            <div key={key} className="pt-5 border-t border-surface-hairline dark:border-surface-dark-hairline">
              <h3 className="font-display text-xl font-bold text-ink-primary dark:text-white mb-2">
                <span className="text-brand-600 dark:text-brand-400 tabular-nums mr-2">{num}.</span>
                {t(`landing.howItWorks.${key}.title`)}
              </h3>
              <p className="text-base font-normal text-ink-muted dark:text-white leading-relaxed">
                {t(`landing.howItWorks.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrivacySection({ t }) {
  const [ref, visible] = useReveal(0.1);
  const privacyItems = [
    { icon: Database,    key: 'ownership' },
    { icon: Lock,        key: 'encryption' },
    { icon: Eye,         key: 'noSell' },
    { icon: CloudOff,    key: 'noAdvice' },
    { icon: ShieldCheck, key: 'analytics' },
    { icon: CreditCard,  key: 'payments' },
  ];
  return (
    <section className="py-24 sm:py-32 border-y border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card">
      <div
        ref={ref}
        className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-start">
          <div className="lg:sticky lg:top-24">
            <Eyebrow>{t('landing.privacy.eyebrow')}</Eyebrow>
            <SectionHeading className="mb-5">{t('landing.privacy.title')}</SectionHeading>
            <p className="text-base font-normal text-ink-muted dark:text-white leading-relaxed">
              {t('landing.privacy.desc')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-8">
            {privacyItems.map(({ icon, key }) => (
              <PrivacyCard
                key={key}
                icon={icon}
                title={t(`landing.privacy.items.${key}.title`)}
                desc={t(`landing.privacy.items.${key}.desc`)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingPreviewSection({ t }) {
  const [ref, visible] = useReveal(0.1);
  const freeItems = ['tx','budgets','goals','categories','reports','networth','healthscore'];
  const premiumItems = ['unlimited','cashflow','healthscore','benchmarks','splits','notifications'];
  return (
    <section className="py-24 sm:py-32 bg-surface-page dark:bg-surface-dark-page">
      <div
        ref={ref}
        className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <div className="text-center mb-14">
          <SectionHeading>{t('landing.pricingPreview.title')}</SectionHeading>
        </div>
        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          {/* Free */}
          <div className="rounded-[10px] border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card p-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center justify-center min-w-[200px] px-2.5 py-1 rounded-md bg-surface-subtle dark:bg-surface-dark-subtle text-ink-primary dark:text-white text-xs font-semibold">
                {t('landing.pricingPreview.free.label')}
              </span>
            </div>
            <ul className="space-y-3">
              {freeItems.map(key => (
                <li key={key} className="flex items-center gap-2.5 text-sm text-ink-primary dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" strokeWidth={2} />
                  {t(`landing.pricingPreview.free.items.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          {/* Premium */}
          <div className="rounded-[10px] border border-brand-600/50 ring-1 ring-brand-600/20 bg-white dark:bg-surface-dark-card p-8 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center justify-center min-w-[200px] px-2.5 py-1 rounded-md bg-brand-600 text-white text-xs font-semibold">
                {t('landing.pricingPreview.premium.label')}
              </span>
            </div>
            <ul className="space-y-3">
              {premiumItems.map(key => (
                <li key={key} className="flex items-center gap-2.5 text-sm text-ink-primary dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" strokeWidth={2} />
                  {t(`landing.pricingPreview.premium.items.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="text-center">
          <Link
            to="/pricing"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-md transition-colors text-sm"
          >
            {t('landing.pricingPreview.cta')}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
          </Link>
          <p className="mt-3 text-sm text-ink-muted dark:text-white">{t('landing.pricingPreview.trial')}</p>
        </div>
      </div>
    </section>
  );
}

function FounderSection({ t }) {
  const [ref, visible] = useReveal(0.15);
  return (
    <section className="py-20 sm:py-24 border-y border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card">
      <div
        ref={ref}
        className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <Eyebrow>{t('landing.founder.eyebrow')}</Eyebrow>
        <blockquote className="relative font-display text-2xl sm:text-3xl font-medium text-ink-primary dark:text-white leading-[1.35] mb-8 pl-10 sm:pl-12">
          <span className="absolute left-0 top-[-6px] text-brand-600 dark:text-brand-accent text-6xl leading-none font-serif select-none" aria-hidden="true">&ldquo;</span>
          {t('landing.founder.quote')}
          <span className="inline-block ml-1 text-brand-600 dark:text-brand-accent text-5xl leading-none font-serif select-none align-bottom translate-y-2" aria-hidden="true">&rdquo;</span>
        </blockquote>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            M
          </div>
          <div>
            <p className="font-semibold text-sm text-ink-primary dark:text-white">{t('landing.founder.name')}</p>
            <p className="text-sm text-ink-muted dark:text-white">{t('landing.founder.role')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection({ t }) {
  const [ref, visible] = useReveal(0.1);
  return (
    <section className="py-24 sm:py-32 bg-surface-page dark:bg-surface-dark-page">
      <div
        ref={ref}
        className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <div className="mb-12">
          <Eyebrow>{t('landing.faq.eyebrow')}</Eyebrow>
          <SectionHeading>{t('landing.faq.title')}</SectionHeading>
        </div>
        <div>
          {FAQ_KEYS.map(key => (
            <FaqItem
              key={key}
              q={t(`landing.faq.items.${key}.q`)}
              a={t(`landing.faq.items.${key}.a`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Data-privacy section.
 *
 * The claims here are load-bearing and must stay true to the implementation:
 * amounts really are encrypted client-side (see utils/crypto/fieldMap.js,
 * ENCRYPT_AMOUNTS) with a key held only by the user. If that ever changes,
 * this copy has to change with it.
 */
function DataPrivacySection({ t }) {
  const [ref, visible] = useReveal(0.1);
  const points = ['device', 'noone', 'yours'];
  const icons = { device: Lock, noone: Eye, yours: Download };

  return (
    <section className="py-20 sm:py-24 bg-surface-page dark:bg-surface-dark-page">
      <div
        ref={ref}
        className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <Eyebrow>{t('landing.dataPrivacy.eyebrow')}</Eyebrow>
        <SectionHeading className="mb-5 max-w-2xl">{t('landing.dataPrivacy.title')}</SectionHeading>
        <p className="text-base font-normal text-ink-muted dark:text-white leading-relaxed mb-12 max-w-xl">
          {t('landing.dataPrivacy.desc')}
        </p>

        <div className="grid gap-8 sm:grid-cols-3">
          {points.map((key) => {
            const Icon = icons[key];
            return (
              <div key={key} className="pt-5 border-t border-surface-hairline dark:border-surface-dark-hairline">
                <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400 mb-3" strokeWidth={1.8} />
                <h3 className="font-medium text-base text-ink-primary dark:text-white mb-1.5">
                  {t(`landing.dataPrivacy.points.${key}.title`)}
                </h3>
                <p className="text-base font-normal text-ink-muted dark:text-white leading-relaxed">
                  {t(`landing.dataPrivacy.points.${key}.desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ToolsSection({ t }) {
  const { i18n } = useTranslation();
  const [ref, visible] = useReveal(0.1);
  return (
    <section className="py-20 sm:py-24 border-y border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card">
      <div
        ref={ref}
        className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <Eyebrow>{t('landing.tools.eyebrow')}</Eyebrow>
        <SectionHeading className="mb-5">{t('landing.tools.title')}</SectionHeading>
        <p className="text-base font-normal text-ink-muted dark:text-white leading-relaxed mb-8 max-w-xl">
          {t('landing.tools.desc')}
        </p>
        {/* Maps over TOOLS so a new tool appears here with no edit to this file.
            The first tool is the primary action (brand fill); the rest stay
            secondary/outlined so the pair reads as a hierarchy rather than two
            buttons competing for the same attention. */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          {TOOLS.map((tool, i) => (
            <Link
              key={tool.path}
              to={toolPath(tool.path, i18n.language)}
              className={`group inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-md transition-colors ${
                i === 0
                  ? 'bg-brand-600 hover:bg-brand-700 text-white'
                  : 'border border-surface-outline dark:border-surface-dark-outline text-ink-primary dark:text-white hover:bg-surface-subtle dark:hover:bg-surface-dark-elevated hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40'
              }`}
            >
              {t(tool.labelKey)}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection({ t, lang }) {
  const [ref, visible] = useReveal(0.1);
  return (
    <section className="relative overflow-hidden bg-white dark:bg-surface-dark-card border-t border-surface-hairline dark:border-surface-dark-hairline py-28 sm:py-36">
      <div
        ref={ref}
        className={`relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-ink-primary dark:text-white leading-[1.0] tracking-[-0.02em] mb-5">
          {t('landing.finalCta.title')}
        </h2>
        <p className="text-lg text-ink-muted dark:text-white/80 leading-relaxed max-w-lg mx-auto mb-10">
          {t('landing.finalCta.desc')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            to={localizedPath('/register', lang)}
            className="group w-full sm:w-auto sm:min-w-[200px] inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-transparent bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-md transition-colors text-base"
          >
            {t('landing.finalCta.button')}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
          </Link>
          <Link
            to={localizedPath('/pricing', lang)}
            className="w-full sm:w-auto sm:min-w-[200px] inline-flex items-center justify-center gap-1.5 px-8 py-3.5 rounded-md border border-surface-outline dark:border-white/20 text-ink-primary dark:text-white hover:border-ink-muted/50 dark:hover:border-white/50 font-medium text-base transition-colors"
          >
            {t('landing.finalCta.secondary')}
          </Link>
        </div>
        <p className="text-sm text-ink-muted dark:text-white">{t('landing.finalCta.trustLine')}</p>
      </div>
    </section>
  );
}
