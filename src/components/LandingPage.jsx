import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMetaTags } from '../hooks/useMetaTags';
import {
  TrendingUp, Target, PieChart, Activity, RefreshCw,
  Globe, BarChart3, Bell, Tag, FileText, Heart,
  ArrowRight, CheckCircle2, Lock, ShieldCheck, CloudOff,
  Download, Trash2, CreditCard, ChevronDown, ChevronUp,
  Zap, Database, Eye,
} from 'lucide-react';

const DemoWorkspace = lazy(() => import('./Landing/DemoWorkspace'));

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

function MiniBarChart() {
  return (
    <div className="flex items-end gap-[3px] sm:gap-1 h-24 w-full">
      {MONTHS_SHORT.map((m, i) => (
        <div key={m} className="flex-1 flex flex-col items-center gap-[2px]">
          <div className="w-full flex flex-col gap-[2px] items-stretch">
            <div
              className="w-full rounded-t-[2px] bg-brand-600/80"
              style={{ height: `${(INCOME_BARS[i] / BAR_MAX) * 72}px` }}
            />
            <div
              className="w-full rounded-t-[2px]"
              style={{ height: `${(EXPENSE_BARS[i] / BAR_MAX) * 72}px`, backgroundColor: '#e8394d', opacity: 0.75 }}
            />
          </div>
          <span className="text-[8px] text-ink-muted dark:text-white hidden sm:block">{m}</span>
        </div>
      ))}
    </div>
  );
}

// ── Health score mini-render ─────────────────────────────────────────────────
function MiniHealthScore() {
  const score = 70;
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-brand-100 dark:text-brand-950/60" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke="#22AD93" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-display text-ink-primary dark:text-white tabular-nums">{score}</span>
          <span className="text-[10px] font-medium text-brand-600 dark:text-brand-400">Good</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full text-center text-[10px] text-ink-muted dark:text-white">
        <div><div className="font-semibold text-sm text-ink-primary dark:text-white">42%</div>Savings</div>
        <div><div className="font-semibold text-sm text-ink-primary dark:text-white">87%</div>Budget</div>
        <div><div className="font-semibold text-sm text-ink-primary dark:text-white">3/4</div>Goals</div>
      </div>
    </div>
  );
}

// ── Mini budget bars ─────────────────────────────────────────────────────────
function MiniBudgets() {
  const items = [
    { label: 'Food & Dining', spent: 210, limit: 300 },
    { label: 'Housing & Rent', spent: 850, limit: 900 },
    { label: 'Entertainment', spent: 47, limit: 50 },
    { label: 'Transport', spent: 28, limit: 80 },
  ];
  return (
    <div className="space-y-3 py-2">
      {items.map(({ label, spent, limit }) => {
        const pct = Math.min((spent / limit) * 100, 100);
        const over = spent > limit;
        return (
          <div key={label}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-medium text-ink-primary dark:text-white truncate">{label}</span>
              <span className={over ? 'text-expense font-semibold' : 'text-ink-muted dark:text-white'}>
                €{spent}<span className="opacity-50">/€{limit}</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-brand-100 dark:bg-brand-950/50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: over ? '#e8394d' : '#22AD93' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Mini currency card ────────────────────────────────────────────────────────
function MiniCurrency() {
  const rows = [
    { flag: '🇺🇸', code: 'USD', amount: '$1,200', base: '€1,104' },
    { flag: '🇦🇱', code: 'ALL', amount: 'L45,000', base: '€460' },
    { flag: '🇨🇭', code: 'CHF', amount: 'Fr380', base: '€397' },
  ];
  return (
    <div className="space-y-2.5 py-2">
      {rows.map(r => (
        <div key={r.code} className="flex items-center gap-3">
          <span className="text-xl leading-none">{r.flag}</span>
          <div className="flex-1">
            <div className="flex justify-between text-[12px]">
              <span className="font-semibold text-ink-primary dark:text-white">{r.code}</span>
              <span className="text-brand-600 dark:text-brand-400 font-semibold tabular-nums">{r.amount}</span>
            </div>
            <div className="text-[10px] text-ink-muted dark:text-white tabular-nums">{r.base}</div>
          </div>
        </div>
      ))}
      <div className="pt-1 border-t border-surface-hairline dark:border-surface-dark-hairline flex justify-between text-[11px]">
        <span className="text-ink-muted dark:text-white">Total (EUR)</span>
        <span className="font-bold text-ink-primary dark:text-white tabular-nums">€1,961</span>
      </div>
    </div>
  );
}

// ── Feature card shell (hero features) ───────────────────────────────────────
function FeatureCard({ eyebrow, title, desc, preview, className = '', flip = false }) {
  const [ref, visible] = useReveal(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} grid lg:grid-cols-2 gap-0 rounded-2xl border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card overflow-hidden ${className}`}
    >
      <div className={`p-8 sm:p-10 flex flex-col justify-center ${flip ? 'lg:order-2' : ''}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400 mb-3">{eyebrow}</p>
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink-primary dark:text-white leading-tight mb-4">{title}</h3>
        <p className="text-base text-ink-muted dark:text-white leading-relaxed">{desc}</p>
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
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center mt-0.5">
        <Icon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" strokeWidth={1.8} />
      </div>
      <span className="text-sm text-ink-primary dark:text-white leading-relaxed">{text}</span>
    </li>
  );
}

// ── Privacy card ──────────────────────────────────────────────────────────────
function PrivacyCard({ icon: Icon, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-600/10 dark:bg-brand-600/15 flex items-center justify-center">
        <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" strokeWidth={1.6} />
      </div>
      <div>
        <h4 className="font-semibold text-sm text-ink-primary dark:text-white mb-1">{title}</h4>
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
        <span className="font-semibold text-base text-ink-primary dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" strokeWidth={2} />
          : <ChevronDown className="w-4 h-4 text-ink-muted dark:text-white flex-shrink-0" strokeWidth={2} />
        }
      </button>
      {open && (
        <p className="pb-5 text-base text-ink-muted dark:text-white leading-relaxed">{a}</p>
      )}
    </div>
  );
}

// ── Eyebrow chip ─────────────────────────────────────────────────────────────
function Eyebrow({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400 mb-4">{children}</p>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ children, className = '' }) {
  return (
    <h2 className={`font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink-primary dark:text-white leading-[1.05] ${className}`}>
      {children}
    </h2>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const LANDING_HREFLANGS = [
  { lang: 'en', href: 'https://personal-finances.app/' },
  { lang: 'sq', href: 'https://personal-finances.app/sq' },
  { lang: 'x-default', href: 'https://personal-finances.app/' },
];

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const isSq = (i18n.language || '').toLowerCase().startsWith('sq');

  useMetaTags({
    title: t('meta.title'),
    description: t('meta.description'),
    canonical: isSq ? 'https://personal-finances.app/sq' : 'https://personal-finances.app/',
    hreflangs: LANDING_HREFLANGS,
  });

  // ── Hero ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden bg-surface-page dark:bg-surface-dark-page"
      >
        {/* Subtle teal tint blob — CSS only, no libraries */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.07] dark:opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #22AD93 0%, transparent 70%)' }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-28">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-start">

            {/* Copy — no scroll-reveal on hero: LCP element must be visible immediately */}
            <div className="lg:pt-6">
              <h1
                className="font-display text-[3.25rem] sm:text-6xl lg:text-[4.25rem] font-bold text-ink-primary dark:text-white leading-[1.0] tracking-[-0.02em] mb-6"
                style={{ animationDelay: '60ms' }}
              >
                {t('landing.hero.titleLine1')}{' '}
                <span className="text-brand-600 dark:text-[#22AD93]">{t('landing.hero.titleAccent')}</span>
              </h1>

              <p
                className="text-lg sm:text-xl text-ink-muted dark:text-white leading-relaxed mb-8 max-w-md"
                style={{ animationDelay: '120ms' }}
              >
                {t('landing.hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6" style={{ animationDelay: '180ms' }}>
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-md transition-all text-base shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/30"
                >
                  {t('landing.hero.getStarted')}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-7 py-3.5 border border-ink-primary/20 hover:border-brand-600/50 dark:border-white/15 dark:hover:border-brand-400/50 text-ink-primary dark:text-white font-medium rounded-md transition-all text-base"
                >
                  {t('landing.hero.signIn')}
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted dark:text-white" style={{ animationDelay: '240ms' }}>
                {[t('landing.hero.trust1'), t('landing.hero.trust2'), t('landing.hero.trust3')].map((label) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 flex-shrink-0" strokeWidth={2.5} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Demo */}
            <div className="relative">
              <Suspense fallback={<div className="rounded-2xl border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card" style={{ minHeight: 520 }} />}>
                <DemoWorkspace />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEMO BAND ────────────────────────────────────────────────────────── */}
      <DemoBandSection t={t} />

      {/* ── HERO FEATURES ────────────────────────────────────────────────────── */}
      <HeroFeaturesSection t={t} />

      {/* ── SECONDARY FEATURES ───────────────────────────────────────────────── */}
      <SecondaryFeaturesSection t={t} />

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <HowItWorksSection t={t} />

      {/* ── PRIVACY & TRUST ──────────────────────────────────────────────────── */}
      <PrivacySection t={t} />

      {/* ── PRICING PREVIEW ──────────────────────────────────────────────────── */}
      <PricingPreviewSection t={t} />

      {/* ── FOUNDER NOTE ─────────────────────────────────────────────────────── */}
      <FounderSection t={t} />

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <FaqSection t={t} />

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <FinalCtaSection t={t} />

    </div>
  );
}

// ── Section components ────────────────────────────────────────────────────────

function DemoBandSection({ t }) {
  const [ref, visible] = useReveal(0.15);
  return (
    <section
      ref={ref}
      className={`bg-brand-600 py-12 sm:py-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight mb-3">
          {t('landing.demoBand.title')}
        </h2>
        <p className="text-base text-white/80 leading-relaxed max-w-2xl mx-auto mb-6">
          {t('landing.demoBand.desc')}
        </p>
        <Link
          to="/register"
          className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-700 font-semibold rounded-md text-sm hover:bg-brand-50 transition-colors"
        >
          {t('landing.demoBand.cta')}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}

function HeroFeaturesSection({ t }) {
  const feats = t('landing.heroFeatures', { returnObjects: true });
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
          <FeatureCard
            eyebrow={feats.tracking.eyebrow}
            title={feats.tracking.title}
            desc={feats.tracking.desc}
            preview={
              <div>
                <div className="flex justify-between items-center mb-4 text-xs font-medium text-ink-muted dark:text-white">
                  <span>2025 — Year to date</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-600 inline-block" />Income</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#e8394d' }} />Expenses</span>
                  </div>
                </div>
                <MiniBarChart />
                <div className="flex gap-5 mt-5 pt-4 border-t border-surface-hairline dark:border-surface-dark-hairline">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-ink-muted dark:text-white mb-0.5">Income</p>
                    <p className="text-xl font-bold text-brand-600 dark:text-brand-400 tabular-nums">€{(INCOME_BARS.reduce((s,v)=>s+v,0)/1000).toFixed(1)}k</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-ink-muted dark:text-white mb-0.5">Expenses</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: '#e8394d' }}>€{(EXPENSE_BARS.reduce((s,v)=>s+v,0)/1000).toFixed(1)}k</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-ink-muted dark:text-white mb-0.5">Saved</p>
                    <p className="text-xl font-bold text-ink-primary dark:text-white tabular-nums">+€{((INCOME_BARS.reduce((s,v)=>s+v,0) - EXPENSE_BARS.reduce((s,v)=>s+v,0))/1000).toFixed(1)}k</p>
                  </div>
                </div>
              </div>
            }
          />

          <FeatureCard
            eyebrow={feats.budgets.eyebrow}
            title={feats.budgets.title}
            desc={feats.budgets.desc}
            flip
            preview={<MiniBudgets />}
          />

          <FeatureCard
            eyebrow={feats.healthscore.eyebrow}
            title={feats.healthscore.title}
            desc={feats.healthscore.desc}
            preview={<MiniHealthScore />}
          />

          <FeatureCard
            eyebrow={feats.multicurrency.eyebrow}
            title={feats.multicurrency.title}
            desc={feats.multicurrency.desc}
            flip
            preview={<MiniCurrency />}
          />
        </div>
      </div>
    </section>
  );
}

function SecondaryFeaturesSection({ t }) {
  const [ref, visible] = useReveal(0.1);
  const items = [
    { icon: RefreshCw,  key: 'recurring' },
    { icon: Target,     key: 'goals' },
    { icon: Activity,   key: 'cashflow' },
    { icon: TrendingUp, key: 'networth' },
    { icon: Zap,        key: 'benchmarks' },
    { icon: FileText,   key: 'reports' },
    { icon: Bell,       key: 'notifications' },
    { icon: Download,   key: 'csvImport' },
    { icon: Tag,        key: 'categories' },
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
        <div className="grid md:grid-cols-3 gap-10 relative">
          {/* Connector line */}
          <div aria-hidden="true" className="hidden md:block absolute top-5 left-[12%] right-[12%] h-px border-t-2 border-dashed border-brand-500/25" />
          {steps.map(({ num, key }) => (
            <div key={key} className="relative">
              <div className="relative z-10 inline-flex w-10 h-10 rounded-md bg-brand-600 text-white items-center justify-center text-sm font-bold mb-5 shadow-lg shadow-brand-600/25">
                {num}
              </div>
              <h3 className="font-display text-xl font-bold text-ink-primary dark:text-white mb-2">
                {t(`landing.howItWorks.${key}.title`)}
              </h3>
              <p className="text-base text-ink-muted dark:text-white leading-relaxed">
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
            <p className="text-base text-ink-muted dark:text-white leading-relaxed">
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
          <Eyebrow>{t('landing.pricingPreview.eyebrow')}</Eyebrow>
          <SectionHeading>{t('landing.pricingPreview.title')}</SectionHeading>
        </div>
        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          {/* Free */}
          <div className="rounded-2xl border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card p-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 text-xs font-semibold">
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
          <div className="rounded-2xl border-2 border-brand-600/40 bg-white dark:bg-surface-dark-card p-8 relative overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{ background: 'radial-gradient(ellipse at top right, #22AD93, transparent 60%)' }}
            />
            <div className="flex items-center gap-2 mb-6">
              <span className="px-2.5 py-1 rounded-md bg-brand-600 text-white text-xs font-semibold">
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
            className="group inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-md transition-colors text-sm shadow-sm shadow-brand-600/20"
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
          <span className="absolute left-0 top-[-6px] text-brand-600 dark:text-[#22AD93] text-6xl leading-none font-serif select-none" aria-hidden="true">&ldquo;</span>
          {t('landing.founder.quote')}
          <span className="inline-block ml-1 text-brand-600 dark:text-[#22AD93] text-5xl leading-none font-serif select-none align-bottom translate-y-2" aria-hidden="true">&rdquo;</span>
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
  const faqKeys = ['free','safe','currencies','cancel','advice','multidevice'];
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
          {faqKeys.map(key => (
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

function FinalCtaSection({ t }) {
  const [ref, visible] = useReveal(0.1);
  return (
    <section className="relative overflow-hidden bg-[#0a1a17] py-28 sm:py-36">
      {/* Dot grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(34,173,147,0.22) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[800px] h-[500px] rounded-full blur-[140px]" style={{ background: 'radial-gradient(ellipse, rgba(34,173,147,0.12) 0%, transparent 70%)' }} />
      </div>

      <div
        ref={ref}
        className={`relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.0] tracking-[-0.02em] mb-5">
          {t('landing.finalCta.title')}
        </h2>
        <p className="text-lg text-white leading-relaxed max-w-lg mx-auto mb-10">
          {t('landing.finalCta.desc')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 px-8 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-md transition-all text-base shadow-xl shadow-brand-600/25 hover:shadow-2xl hover:shadow-brand-500/30"
          >
            {t('landing.finalCta.button')}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 px-8 py-3.5 rounded-md border border-white/20 text-white hover:border-white/50 font-medium text-base transition-all"
          >
            {t('landing.finalCta.secondary')}
          </Link>
        </div>
        <p className="text-sm text-white">{t('landing.finalCta.trustLine')}</p>
      </div>
    </section>
  );
}
