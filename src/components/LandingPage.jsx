import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMetaTags } from '../hooks/useMetaTags';
import { useRevealOnce } from '../hooks/useRevealOnce';
import { TOOLS, toolPath, localizedPath } from '../lib/tools';
import HeroPreview from './Landing/HeroPreview';
import PrimaryCta, { SecondaryEntry } from './Landing/PrimaryCta';
import StickyCta from './Landing/StickyCta';
import {
  MiniHealthScore, MiniBenchmarks, MiniBudgetForecast, MiniYear,
  StepAccountSnippet, StepMoneySnippet, StepScoreSnippet,
} from './Landing/FeatureMinis';
import { delayStyle, revealClass, tileDelay, D_DATA } from '../utils/motion';
import { money, SPENDING, CIPHERTEXT_EXAMPLE } from './Landing/demoData';
import {
  TrendingUp, Target, RefreshCw, Globe, FileText,
  ArrowRight, Check, Lock, Eye, Download, CreditCard, ChevronDown,
} from 'lucide-react';

// The salary teaser pulls in the tax engine: lazy, so it stays out of the
// landing chunk. Its fallback reserves the measured rendered height
// (below sm / sm / lg / xl) so the page does not shift when it lands.
const SalaryTeaser = lazy(() => import('./Landing/SalaryTeaser'));
const SALARY_TEASER_MIN_H = 'min-h-[591px] sm:min-h-[420px] lg:min-h-[460px] xl:min-h-[384px]';

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
  // The sticky bar watches these two: it appears once the hero CTA is
  // scrolled past and hides when the final CTA section arrives.
  const heroCtaRef = useRef(null);
  const finalRef = useRef(null);

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

  return (
    <div className="min-h-screen" data-landing>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      {/* One mint block (R_HERO): the promise on the left (5 cols), the
          product on the right (7 cols). The H1 is the LCP element: no
          entrance animation, visible on first paint (I5). The preview is
          static HTML (Landing/HeroPreview); its tiles pop in. Below 1024px
          the trust checklist follows the preview, so the preview starts
          inside the first phone screen. */}
      <section className="max-w-content mx-auto">
        <div className="tile-inner rounded-hero p-[clamp(28px,4vw,56px)] grid lg:grid-cols-12 gap-x-gap gap-y-7 lg:gap-y-0">
          <div className="lg:col-span-5 lg:self-end min-w-0">
            <h1 className="text-h1-lg font-extrabold text-fg">
              {t('landing.hero.titleLine1')} {t('landing.hero.titleAccent')}
            </h1>

            <p className="mt-[22px] text-body-lg text-fg animate-rise" style={delayStyle(140)}>
              {t('landing.hero.subtitle')}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-3 animate-rise" style={delayStyle(280)}>
              <PrimaryCta location="hero" ref={heroCtaRef} />
              <SecondaryEntry />
            </div>
          </div>

          <div className="lg:col-start-6 lg:col-span-7 lg:row-start-1 lg:row-span-2 lg:self-center min-w-0">
            <HeroPreview />
          </div>

          <ul className="lg:col-start-1 lg:col-span-5 lg:row-start-2 lg:self-start lg:mt-7 flex flex-col gap-2 list-none m-0 p-0 animate-rise" style={delayStyle(420)}>
            {[t('landing.hero.trust1'), t('landing.hero.trust2'), t('landing.hero.trust3')].map((label) => (
              <li key={label} className="flex items-center gap-2.5 text-sm font-semibold text-fg">
                <Check className="w-[18px] h-[18px] text-brand-text shrink-0" strokeWidth={2.6} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* One job: turn a visitor into a signup. Order is value > how >
          trust > free tools > price > questions > final CTA with the
          founder. Every "Start free" is a tracked PrimaryCta. */}
      <HeroFeaturesSection t={t} />
      <HowItWorksSection t={t} />
      <TrustSection t={t} />
      <ToolsSection t={t} />
      <PricingPreviewSection t={t} />
      <FaqSection t={t} />
      <FinalCtaSection t={t} sectionRef={finalRef} />
      <StickyCta heroCtaRef={heroCtaRef} finalRef={finalRef} />

    </div>
  );
}

// ── Scroll reveal for a section: hidden until it enters, then rise/pop once ──
function useSectionReveal() {
  const [ref, revealed] = useRevealOnce();
  // rise for text, pop for tiles, stagger by index (spec 4.6)
  const rise = (i = 0) => ({ className: revealClass(revealed, 'animate-rise'), style: revealed ? delayStyle(i * 70) : undefined });
  const pop = (i = 0) => ({ className: revealClass(revealed, 'animate-pop'), style: revealed ? delayStyle(tileDelay(i)) : undefined });
  return { ref, rise, pop, revealed };
}

function SectionHead({ children, rise, id, className = '' }) {
  const r = rise(0);
  return (
    <h2 id={id} className={`text-h2-lg font-extrabold text-fg ${r.className} ${className}`} style={r.style}>
      {children}
    </h2>
  );
}

// ── Sections ─────────────────────────────────────────────────────────────────

// Section rhythm: one vertical gap between landing sections (3 x GAP).
const SECTION_PB = 'pb-12';

// Below 640px the four tiles are one snap row (86% wide, the next one
// peeks), like the hero preview; from 640px a 2-column grid, from 1024px
// the bento rows.
const FEATURE_ROW = 'flex gap-gap overflow-x-auto snap-x snap-mandatory -mx-4 px-4 scroll-px-4 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none sm:mx-0 sm:px-0 sm:pb-0 lg:grid-cols-12';
const FEATURE_CELL = 'shrink-0 w-[86%] snap-start sm:w-auto';

/** True while the viewport is below 640px (the features row scrolls). */
function useBelowSm() {
  const query = '(max-width: 639px)';
  const [below, setBelow] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const on = () => setBelow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return below;
}

function FeatureTile({ feat, preview, pop, className = '' }) {
  return (
    <article className={`tile tile-lift p-tile-dense sm:p-tile flex flex-col justify-between gap-[18px] min-w-0 ${FEATURE_CELL} ${pop.className} ${className}`} style={pop.style}>
      <div>
        <h3 className="text-h3-lg font-bold text-fg">{feat?.title}</h3>
        <p className="mt-2.5 text-body text-fg">{feat?.desc}</p>
      </div>
      <div>{preview}</div>
    </article>
  );
}

// "Also included": six plain lines, a 16px icon each (no tinted squares, R5).
// Keys must exist in landing.secondaryFeatures.items (both locales).
const ALSO_INCLUDED = [
  { Icon: RefreshCw,  key: 'recurring' },
  { Icon: Target,     key: 'goals' },
  { Icon: TrendingUp, key: 'networth' },
  { Icon: FileText,   key: 'reports' },
  { Icon: Download,   key: 'csvImport' },
  { Icon: Globe,      key: 'albanian' },
];

function HeroFeaturesSection({ t }) {
  // returnObjects can yield the key string before the i18n bundle resolves
  // (first language switch). Coerce to an object so nested access never throws.
  const raw = t('landing.heroFeatures', { returnObjects: true });
  const feats = (raw && typeof raw === 'object') ? raw : {};
  const { ref, rise, pop } = useSectionReveal();
  const also = rise(2);
  const cta = rise(3);
  // The row scrolls only on phones; only then is it a keyboard stop.
  const scrolls = useBelowSm();
  return (
    <section ref={ref} aria-labelledby="features-title" className={`max-w-content mx-auto pt-12 ${SECTION_PB}`}>
      <SectionHead rise={rise} id="features-title" className="max-w-3xl">{t('landing.features.heading')}</SectionHead>
      {/* Two rows on lg: score (5) + benchmarks (7), then forecast (7) +
          12 months (5). Tiles stretch only to the taller tile of their own
          row; text sits on top, the mini at the bottom. */}
      <div
        className={`mt-8 ${FEATURE_ROW}`}
        role={scrolls ? 'region' : undefined}
        aria-labelledby={scrolls ? 'features-title' : undefined}
        tabIndex={scrolls ? 0 : undefined}
      >
        <FeatureTile feat={feats.healthscore} pop={pop(0)} preview={<MiniHealthScore />} className="lg:col-span-5" />
        <FeatureTile feat={feats.benchmarks} pop={pop(1)} preview={<MiniBenchmarks />} className="lg:col-span-7" />
        <FeatureTile feat={feats.budgets} pop={pop(2)} preview={<MiniBudgetForecast />} className="lg:col-span-7" />
        <FeatureTile feat={feats.tracking} pop={pop(3)} preview={<MiniYear />} className="lg:col-span-5" />
      </div>

      <div className={`mt-8 ${also.className}`} style={also.style}>
        <h3 className="text-h3-lg font-bold text-fg">{t('landing.secondaryFeatures.title')}</h3>
        <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 list-none m-0 p-0">
          {ALSO_INCLUDED.map(({ Icon, key }) => (
            <li key={key} className="flex items-start gap-2.5 text-body font-semibold text-fg">
              <Icon className="w-4 h-4 mt-[5px] shrink-0 text-brand-text" strokeWidth={2.4} aria-hidden="true" />
              <span>{t(`landing.secondaryFeatures.items.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={`mt-8 flex justify-center ${cta.className}`} style={cta.style}>
        <PrimaryCta location="features" className="w-full sm:w-auto" />
      </div>
    </section>
  );
}

/**
 * How it works: one tile, three steps on one line from lg (a column below),
 * joined by a 2px --line track that fills once, step by step, when the
 * section is revealed; the markers pop as the fill reaches them. Markers are
 * plain dots: no icon squares, no numbers (R5).
 */
const STEPS = [
  { key: 'step1', Snippet: StepAccountSnippet },
  { key: 'step2', Snippet: StepMoneySnippet },
  { key: 'step3', Snippet: StepScoreSnippet },
];

function HowItWorksSection({ t }) {
  const { ref, rise, revealed } = useSectionReveal();
  const p = rise(1);
  return (
    <section ref={ref} aria-label={t('landing.howItWorks.title')} className={`max-w-content mx-auto ${SECTION_PB}`}>
      <div className="tile p-tile-dense sm:p-[clamp(26px,3vw,40px)]">
        <SectionHead rise={rise}>{t('landing.howItWorks.subtitle')}</SectionHead>
        <ol className={`mt-8 grid lg:grid-cols-3 gap-8 lg:gap-gap list-none m-0 p-0 ${p.className}`} style={p.style}>
          {STEPS.map(({ key, Snippet }, i) => (
            <li key={key} className="relative min-w-0 pl-9 lg:pl-0 lg:pt-9 lg:pr-gap">
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className="absolute overflow-hidden bg-line left-[7px] top-6 -bottom-8 w-[2px] lg:left-6 lg:-right-2 lg:top-[7px] lg:bottom-auto lg:w-auto lg:h-[2px]">
                  <span
                    className={`block w-full h-full bg-brand-text origin-top lg:origin-left ${revealed ? 'animate-grow-y lg:animate-grow-x' : 'reveal-pending'}`}
                    style={revealed ? delayStyle(i * D_DATA) : undefined}
                  />
                </span>
              )}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-1 lg:top-0 w-4 h-4 rounded-pill bg-brand-text ${revealClass(revealed, 'animate-pop')}`}
                style={revealed ? delayStyle(i * D_DATA) : undefined}
              />
              <h3 className="text-h3-lg font-bold text-fg">{t(`landing.howItWorks.${key}.title`)}</h3>
              <p className="mt-2 text-body text-fg">{t(`landing.howItWorks.${key}.desc`)}</p>
              <div className="mt-4"><Snippet /></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Trust: the two old privacy sections merged into one. The claims are
 * load-bearing and must stay true to the implementation: amounts, titles,
 * tags and notes really are encrypted client-side (utils/crypto/fieldMap.js,
 * ENCRYPT_AMOUNTS) with a key only the user can unwrap. If that ever
 * changes, this copy has to change with it.
 */
const TRUST_ROWS = [
  { Icon: Lock,       key: 'device' },
  { Icon: Eye,        key: 'noSell' },
  { Icon: Download,   key: 'yours' },
  { Icon: CreditCard, key: 'payments' },
];

function TrustSection({ t }) {
  const { ref, rise, pop } = useSectionReveal();
  const r = rise(1);
  const p = pop(1);
  const foot = rise(2);
  return (
    <section ref={ref} aria-labelledby="trust-title" className={`max-w-content mx-auto ${SECTION_PB}`}>
      <div className="grid lg:grid-cols-12 gap-x-gap gap-y-8 items-center">
        <div className="lg:col-span-5">
          <SectionHead rise={rise} id="trust-title">{t('landing.trust.title')}</SectionHead>
          <p className={`mt-5 text-body-lg text-fg ${r.className}`} style={r.style}>{t('landing.trust.desc')}</p>
        </div>
        <div className="lg:col-span-7 min-w-0">
          <div className={`tile p-tile-dense sm:p-tile ${p.className}`} style={p.style}>
            {/* What you type vs what the server stores (static example). */}
            <div className="tile-inner p-gap grid sm:grid-cols-[auto_1fr] gap-x-8 gap-y-3">
              <div>
                <p className="text-sm font-semibold text-fg">{t('landing.trust.youType')}</p>
                <p className="mt-1 text-h3 font-extrabold text-fg tabular-nums">{money(SPENDING, 2)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">{t('landing.trust.serverStores')}</p>
                <p className="mt-1.5 font-mono text-sm font-semibold text-fg [overflow-wrap:anywhere]">{CIPHERTEXT_EXAMPLE}</p>
              </div>
            </div>
            {/* One column of rows below lg; a 2x2 grid on lg. Hairlines go
                between rows only, never above the first row of a column. */}
            <ul className="mt-2 list-none m-0 p-0 lg:grid lg:grid-cols-2 lg:gap-x-8">
              {TRUST_ROWS.map(({ Icon, key }, i) => (
                <li key={key} className={`flex gap-3 py-4 ${i > 0 ? 'border-t border-line' : ''} ${i === 1 ? 'lg:border-t-0' : ''} ${i >= TRUST_ROWS.length - 2 ? 'lg:pb-0' : ''} ${i === TRUST_ROWS.length - 1 ? 'pb-0' : ''}`}>
                  <Icon className="w-4 h-4 mt-[5px] shrink-0 text-brand-text" strokeWidth={2.4} aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="text-body font-bold text-fg">{t(`landing.trust.rows.${key}.title`)}</h3>
                    <p className="mt-0.5 text-body text-fg">{t(`landing.trust.rows.${key}.desc`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className={`mt-4 text-sm font-semibold text-fg ${foot.className}`} style={foot.style}>{t('landing.trust.footnote')}</p>
        </div>
      </div>
    </section>
  );
}

function PricingPreviewSection({ t }) {
  const { i18n } = useTranslation();
  const { ref, rise, pop } = useSectionReveal();
  const freeItems = ['tx','budgets','goals','categories','reports','networth','healthscore'];
  const premiumItems = ['unlimited','cashflow','healthscore','benchmarks','splits','notifications'];
  const free = pop(0);
  const prem = pop(1);
  return (
    <section ref={ref} id="pricing-preview" aria-labelledby="pricing-title" className={`max-w-content mx-auto ${SECTION_PB}`}>
      <SectionHead rise={rise} id="pricing-title">{t('landing.pricingPreview.title')}</SectionHead>
      <div className="mt-8 grid lg:grid-cols-2 gap-gap">
        {/* Free: carries the page's primary action */}
        <div className={`tile tile-lift p-tile-dense sm:p-tile flex flex-col ${free.className}`} style={free.style}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-h3-lg font-bold text-fg">{t('landing.pricingPreview.free.label')}</h3>
            <p className="text-h1 font-extrabold tabular-nums text-fg">{t('pricing.free')}</p>
          </div>
          <ul className="mt-5 mb-7 flex flex-col gap-2">
            {freeItems.map(key => (
              <li key={key} className="flex items-center gap-2.5 text-body font-semibold text-fg">
                <Check className="w-[18px] h-[18px] text-brand-text shrink-0" strokeWidth={2.6} aria-hidden="true" />
                {t(`landing.pricingPreview.free.items.${key}`)}
              </li>
            ))}
          </ul>
          <PrimaryCta location="pricing" className="mt-auto self-stretch sm:self-start" />
        </div>
        {/* Premium: the hero tile, with its own (white) plan button */}
        <div className={`tile tile-hero tile-lift p-tile-dense sm:p-tile flex flex-col ${prem.className}`} style={prem.style}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-h3-lg font-bold flex items-center gap-2.5">
              {t('landing.pricingPreview.premium.label')}
              <span className="inline-flex items-center h-[30px] px-3 rounded-pill bg-hero-inset text-sm font-bold">{t('pricing.freeTrial')}</span>
            </h3>
            <p>
              <span className="text-h1 font-extrabold tabular-nums">{t('pricing.yearlyPrice')}</span>
              <span className="ml-1 font-semibold">{t('pricing.perYear')}</span>
            </p>
          </div>
          <p className="mt-1 text-sm font-semibold">{t('pricing.yearlyPerMonth')}</p>
          <ul className="mt-5 mb-7 flex flex-col gap-2">
            {premiumItems.map(key => (
              <li key={key} className="flex items-center gap-2.5 text-body font-semibold">
                <Check className="w-[18px] h-[18px] shrink-0" strokeWidth={2.6} style={{ color: 'var(--toast-check)' }} aria-hidden="true" />
                {t(`landing.pricingPreview.premium.items.${key}`)}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col sm:flex-row sm:items-center gap-3">
            <Link
              to={localizedPath('/pricing', i18n.language)}
              className="group btn-motion btn-lift inline-flex items-center justify-center gap-2.5 min-h-[52px] px-7 border-2 border-white bg-white hover:bg-brand-50 hover:border-brand-50 text-brand-600 font-bold rounded-pill text-body-lg whitespace-nowrap"
            >
              {t('landing.pricingPreview.cta')}
              <ArrowRight className="arrow-nudge w-[18px] h-[18px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
            </Link>
            <p className="text-sm font-semibold">{t('landing.pricingPreview.trial')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a, className = 'border-b border-line' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        className="w-full min-h-11 flex items-center justify-between gap-4 py-4 text-left group"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="font-bold text-body-lg text-fg">{q}</span>
        <span className="w-11 h-11 shrink-0 rounded-pill bg-inner flex items-center justify-center text-fg btn-motion group-hover:bg-inner-2" aria-hidden="true">
          <ChevronDown className={`plus-spin w-5 h-5 ${open ? 'rotate-180' : ''}`} strokeWidth={2.4} />
        </span>
      </button>
      {open && (
        <p className="pb-4 text-body-lg text-fg animate-rise">{a}</p>
      )}
    </div>
  );
}

function FaqSection({ t }) {
  const { ref, rise, pop } = useSectionReveal();
  const p = pop(0);
  return (
    <section ref={ref} aria-labelledby="faq-title" className={`max-w-content mx-auto ${SECTION_PB}`}>
      <SectionHead rise={rise} id="faq-title">{t('landing.faq.title')}</SectionHead>
      {/* One list below lg; two columns of four on lg. Same order and keys
          as the FAQPage JSON-LD. */}
      <div className={`mt-8 tile px-tile-dense sm:px-tile py-2 lg:grid lg:grid-cols-2 lg:gap-x-10 items-start ${p.className}`} style={p.style}>
        {[FAQ_KEYS.slice(0, 4), FAQ_KEYS.slice(4)].map((col, c) => (
          <div key={c}>
            {col.map((key, i) => {
              const lastInCol = i === col.length - 1;
              const border = !lastInCol ? 'border-b border-line' : c === 0 ? 'border-b border-line lg:border-b-0' : '';
              return <FaqItem key={key} className={border} q={t(`landing.faq.items.${key}.q`)} a={t(`landing.faq.items.${key}.a`)} />;
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Free tools for Albania: the three tool links on the left, and a compact
 * gross-to-net calculator (Landing/SalaryTeaser, lazy) on the right. The
 * fallback reserves the teaser's rendered height so nothing below shifts
 * when it arrives (R7, CLS).
 */
/** True once the node is within ~one screen of the viewport (then stays true). */
function useNearViewport(ref, margin = '800px 0px') {
  const [near, setNear] = useState(() => typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function');
  useEffect(() => {
    if (near || !ref.current) return undefined;
    const io = new window.IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [near, ref, margin]);
  return near;
}

function ToolsSection({ t }) {
  const { i18n } = useTranslation();
  const { ref, rise, pop } = useSectionReveal();
  // The teaser (and its tax engine) loads only as the section approaches, so
  // it stays off the initial load; the fallback holds its height meanwhile.
  const near = useNearViewport(ref);
  const r = rise(1);
  const links = rise(2);
  const p = pop(1);
  return (
    <section ref={ref} aria-labelledby="tools-title" className={`max-w-content mx-auto ${SECTION_PB}`}>
      <div className="grid lg:grid-cols-12 gap-x-gap gap-y-8 items-start">
        <div className="lg:col-span-5">
          <SectionHead rise={rise} id="tools-title">{t('landing.tools.title')}</SectionHead>
          <p className={`mt-5 text-body-lg text-fg ${r.className}`} style={r.style}>{t('landing.tools.desc')}</p>
          <ul className={`mt-5 list-none m-0 p-0 flex flex-col ${links.className}`} style={links.style}>
            {TOOLS.map((tool) => (
              <li key={tool.path}>
                <Link
                  to={toolPath(tool.path, i18n.language)}
                  className="group inline-flex items-center gap-2 min-h-11 font-bold text-body-lg text-fg underline-offset-4 decoration-2 hover:underline focus-visible:underline"
                >
                  {t(tool.labelKey)}
                  <ArrowRight className="arrow-nudge w-[18px] h-[18px] shrink-0 text-brand-text" strokeWidth={2.4} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className={`lg:col-span-7 min-w-0 ${p.className}`} style={p.style}>
          {near ? (
            <Suspense fallback={<div className={`tile ${SALARY_TEASER_MIN_H}`} aria-hidden="true" />}>
              <SalaryTeaser />
            </Suspense>
          ) : <div className={`tile ${SALARY_TEASER_MIN_H}`} aria-hidden="true" />}
        </div>
      </div>
    </section>
  );
}

/**
 * Final CTA and the founder in one mint block: the ask on the left (7 cols),
 * the person behind the app on the right (5 cols), so neither side is a
 * half-empty card (R3, R4).
 */
function FinalCtaSection({ t, sectionRef }) {
  const { ref, rise, pop } = useSectionReveal();
  const r1 = rise(1);
  const r2 = rise(2);
  const quote = pop(2);
  const name = t('landing.founder.name');
  const setRefs = (node) => { ref.current = node; if (sectionRef) sectionRef.current = node; };
  return (
    <section ref={setRefs} aria-labelledby="final-title" className={`max-w-content mx-auto ${SECTION_PB}`}>
      <div className="tile-inner rounded-hero p-[clamp(28px,4vw,56px)] grid lg:grid-cols-12 gap-x-gap gap-y-8 items-center">
        <div className="lg:col-span-7 min-w-0">
          <SectionHead rise={rise} id="final-title">{t('landing.finalCta.title')}</SectionHead>
          <p className={`mt-5 text-body-lg text-fg max-w-xl ${r1.className}`} style={r1.style}>{t('landing.finalCta.desc')}</p>
          <div className={`mt-8 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 ${r2.className}`} style={r2.style}>
            <PrimaryCta location="final" />
            <SecondaryEntry />
          </div>
          <p className={`mt-5 text-sm font-semibold text-fg ${r2.className}`} style={r2.style}>{t('landing.finalCta.trustLine')}</p>
        </div>
        <figure className={`lg:col-span-5 min-w-0 tile p-tile-dense sm:p-tile m-0 ${quote.className}`} style={quote.style}>
          <blockquote className="text-body-lg font-semibold text-fg">
            &ldquo;{t('landing.founder.quote')}&rdquo;
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-4">
            <span className="w-12 h-12 rounded-icon bg-brand-600 flex items-center justify-center text-white font-extrabold text-body-lg shrink-0" aria-hidden="true">{name.charAt(0)}</span>
            <span>
              <span className="block font-bold text-fg">{name}</span>
              <span className="block text-sm font-semibold text-fg">{t('landing.founder.role')}</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
