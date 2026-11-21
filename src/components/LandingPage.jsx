import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMetaTags } from '../hooks/useMetaTags';
import { useRevealOnce } from '../hooks/useRevealOnce';
import { TOOLS, toolPath, localizedPath } from '../lib/tools';
import HeroPreview from './Landing/HeroPreview';
import { MiniHealthScore, MiniBenchmarks, MiniBudgetForecast, MiniYear } from './Landing/FeatureMinis';
import { delayStyle, revealClass, tileDelay } from '../utils/motion';
import {
  TrendingUp, Target, Activity, RefreshCw,
  Globe, Bell, Tag, FileText,
  ArrowRight, Check, Lock, ShieldCheck, CloudOff,
  Download, CreditCard, ChevronDown,
  Database, Eye, UserPlus, ListPlus,
} from 'lucide-react';

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

  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      {/* One mint block (R_HERO): the promise on the left (5 cols), the
          product on the right (7 cols). The H1 is the LCP element: no
          entrance animation, visible on first paint (I5). The preview is
          static HTML (Landing/HeroPreview); its tiles pop in. */}
      <section className="max-w-content mx-auto">
        <div className="tile-inner rounded-hero p-[clamp(28px,5vw,64px)] grid lg:grid-cols-12 gap-[clamp(28px,4vw,48px)] lg:gap-gap items-center">
          <div className="lg:col-span-5 min-w-0">
            <h1 className="text-h1-lg font-extrabold text-fg">
              {t('landing.hero.titleLine1')} {t('landing.hero.titleAccent')}
            </h1>

            <p className="mt-[22px] text-body-lg text-fg animate-rise" style={delayStyle(140)}>
              {t('landing.hero.subtitle')}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-3 animate-rise" style={delayStyle(280)}>
              <Link
                to={localizedPath('/register', i18n.language)}
                className="group btn-motion btn-lift inline-flex items-center justify-center gap-2.5 min-h-[52px] px-7 border-2 border-brand-600 bg-brand-600 hover:bg-brand-700 hover:border-brand-700 text-white font-bold rounded-pill text-body-lg"
              >
                {t('landing.hero.getStarted')}
                <ArrowRight className="arrow-nudge w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden="true" />
              </Link>
              <Link
                to={localizedPath('/login', i18n.language)}
                className="btn-motion btn-lift inline-flex items-center justify-center min-h-[52px] px-7 rounded-pill border-2 border-fg bg-tile text-fg hover:bg-fg hover:text-tile font-bold text-body-lg"
              >
                {t('landing.hero.signIn')}
              </Link>
            </div>

            <ul className="mt-7 flex flex-col gap-2 list-none m-0 p-0 animate-rise" style={delayStyle(420)}>
              {[t('landing.hero.trust1'), t('landing.hero.trust2'), t('landing.hero.trust3')].map((label) => (
                <li key={label} className="flex items-center gap-2.5 text-sm font-semibold text-fg">
                  <Check className="w-[18px] h-[18px] text-brand-text shrink-0" strokeWidth={2.6} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7 min-w-0">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* Order is value > proof > how > trust > price > founder > FAQ >
          tools > final CTA. */}
      <HeroFeaturesSection t={t} />
      <SecondaryFeaturesSection t={t} />
      <HowItWorksSection t={t} />
      <DataPrivacySection t={t} />
      <PrivacySection t={t} />
      <PricingPreviewSection t={t} />
      <FounderSection t={t} />
      <FaqSection t={t} />
      <ToolsSection t={t} />
      <FinalCtaSection t={t} lang={i18n.language} />

    </div>
  );
}

// ── Scroll reveal for a section: hidden until it enters, then rise/pop once ──
function useSectionReveal() {
  const [ref, revealed] = useRevealOnce();
  // rise for text, pop for tiles, stagger by index (spec 4.6)
  const rise = (i = 0) => ({ className: revealClass(revealed, 'animate-rise'), style: revealed ? delayStyle(i * 70) : undefined });
  const pop = (i = 0) => ({ className: revealClass(revealed, 'animate-pop'), style: revealed ? delayStyle(tileDelay(i)) : undefined });
  return { ref, rise, pop };
}

function SectionHead({ children, rise, className = '' }) {
  const r = rise(0);
  return (
    <h2 className={`text-h2-lg font-extrabold text-fg ${r.className} ${className}`} style={r.style}>
      {children}
    </h2>
  );
}

// ── Sections ─────────────────────────────────────────────────────────────────

function HeroFeaturesSection({ t }) {
  // returnObjects can yield the key string before the i18n bundle resolves
  // (first language switch). Coerce to an object so nested access never throws.
  const raw = t('landing.heroFeatures', { returnObjects: true });
  const feats = (raw && typeof raw === 'object') ? raw : {};
  const { ref, rise, pop } = useSectionReveal();
  const FeatureTile = ({ k, preview, i, className = '' }) => {
    const p = pop(i);
    return (
      <article className={`tile tile-lift p-tile-dense sm:p-tile flex flex-col gap-[18px] min-w-0 ${p.className} ${className}`} style={p.style}>
        <div>
          <h3 className="text-h3-lg font-bold text-fg">{feats[k]?.title}</h3>
          <p className="mt-2.5 text-body text-fg">{feats[k]?.desc}</p>
          <span className="mt-3 inline-flex items-center h-[30px] px-3 rounded-pill bg-inner text-sm font-bold text-fg">{feats[k]?.eyebrow}</span>
        </div>
        <div className="mt-auto">{preview}</div>
      </article>
    );
  };
  return (
    <section ref={ref} aria-label={t('landing.features.eyebrow')} className="max-w-content mx-auto pt-[clamp(80px,9vw,120px)] pb-[clamp(64px,8vw,96px)]">
      <div className="grid lg:grid-cols-12 gap-gap items-end">
        <SectionHead rise={rise} className="lg:col-span-6">{t('landing.features.heading')}</SectionHead>
      </div>
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-gap">
        {/* Strongest proof first: the score is the differentiator. */}
        <FeatureTile k="healthscore" i={0} preview={<MiniHealthScore />} className="lg:col-span-4 lg:row-span-2" />
        <FeatureTile k="benchmarks" i={1} preview={<MiniBenchmarks />} className="lg:col-span-8" />
        <FeatureTile k="budgets" i={2} preview={<MiniBudgetForecast />} className="lg:col-span-4" />
        <FeatureTile k="tracking" i={3} preview={<MiniYear />} className="lg:col-span-4" />
      </div>
    </section>
  );
}

function SecondaryFeaturesSection({ t }) {
  const { ref, rise, pop } = useSectionReveal();
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
  const p = pop(0);
  return (
    <section ref={ref} className="max-w-content mx-auto pb-[clamp(64px,8vw,96px)]">
      <div className={`tile p-tile-dense sm:p-tile ${p.className}`} style={p.style}>
        <SectionHead rise={rise} className="mb-6">{t('landing.secondaryFeatures.title')}</SectionHead>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-gap gap-y-1 list-none m-0 p-0">
          {items.map(({ icon: Icon, key }) => (
            <li key={key} className="activity-row flex items-center gap-[14px] p-2.5 rounded-icon">
              <span className="activity-icon w-12 h-12 shrink-0 rounded-icon bg-inner text-brand-text flex items-center justify-center" aria-hidden="true">
                <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
              </span>
              <span className="text-body font-semibold text-fg">{t(`landing.secondaryFeatures.items.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorksSection({ t }) {
  const { ref, rise, pop } = useSectionReveal();
  // Icons, not "1 2 3" numbering (V6); order still reads left to right.
  const steps = [
    { Icon: UserPlus, key: 'step1' },
    { Icon: ListPlus, key: 'step2' },
    { Icon: Activity, key: 'step3' },
  ];
  return (
    <section ref={ref} aria-label={t('landing.howItWorks.title')} className="max-w-content mx-auto pb-[clamp(64px,8vw,96px)]">
      <div className="tile-inner rounded-hero p-[clamp(28px,5vw,64px)]">
        <SectionHead rise={rise} className="mb-10 max-w-2xl">{t('landing.howItWorks.subtitle')}</SectionHead>
        <div className="grid md:grid-cols-3 gap-gap">
          {steps.map(({ Icon, key }, i) => {
            const p = pop(i + 1);
            return (
              <div key={key} className={`tile tile-lift p-tile-dense ${p.className}`} style={p.style}>
                <span className="w-12 h-12 rounded-icon bg-inner text-brand-text flex items-center justify-center mb-4" aria-hidden="true">
                  <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
                </span>
                <h3 className="text-h3-lg font-bold text-fg mb-2">{t(`landing.howItWorks.${key}.title`)}</h3>
                <p className="text-body text-fg">{t(`landing.howItWorks.${key}.desc`)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Data-privacy section. The claims are load-bearing and must stay true to the
 * implementation: amounts really are encrypted client-side (see
 * utils/crypto/fieldMap.js, ENCRYPT_AMOUNTS) with a key held only by the
 * user. If that ever changes, this copy has to change with it.
 */
function DataPrivacySection({ t }) {
  const { ref, rise, pop } = useSectionReveal();
  const points = ['device', 'noone', 'yours'];
  const icons = { device: Lock, noone: Eye, yours: Download };
  const r = rise(1);
  return (
    <section ref={ref} aria-label={t('landing.dataPrivacy.eyebrow')} className="max-w-content mx-auto pb-[clamp(64px,8vw,96px)]">
      <div className="grid lg:grid-cols-12 gap-gap items-end mb-12">
        <SectionHead rise={rise} className="lg:col-span-6">{t('landing.dataPrivacy.title')}</SectionHead>
        <p className={`lg:col-start-8 lg:col-span-5 text-body-lg text-fg ${r.className}`} style={r.style}>
          {t('landing.dataPrivacy.desc')}
        </p>
      </div>
      <div className="grid gap-gap sm:grid-cols-3">
        {points.map((key, i) => {
          const Icon = icons[key];
          const p = pop(i);
          // The first point (encrypted on your device) is the section's hero tile.
          const hero = i === 0;
          return (
            <div key={key} className={`tile tile-lift ${hero ? 'tile-hero' : ''} p-tile-dense sm:p-tile ${p.className}`} style={p.style}>
              <span className={`w-12 h-12 rounded-icon flex items-center justify-center mb-4 ${hero ? 'bg-hero-inset' : 'bg-inner text-brand-text'}`} aria-hidden="true">
                <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
              </span>
              <h3 className={`text-h3-lg font-bold mb-2 ${hero ? '' : 'text-fg'}`}>{t(`landing.dataPrivacy.points.${key}.title`)}</h3>
              <p className={`text-body ${hero ? '' : 'text-fg'}`}>{t(`landing.dataPrivacy.points.${key}.desc`)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PrivacySection({ t }) {
  const { ref, rise, pop } = useSectionReveal();
  const privacyItems = [
    { icon: Database,    key: 'ownership' },
    { icon: Lock,        key: 'encryption' },
    { icon: Eye,         key: 'noSell' },
    { icon: CloudOff,    key: 'noAdvice' },
    { icon: ShieldCheck, key: 'analytics' },
    { icon: CreditCard,  key: 'payments' },
  ];
  const r = rise(1);
  return (
    <section ref={ref} aria-label={t('landing.privacy.eyebrow')} className="max-w-content mx-auto pb-[clamp(64px,8vw,96px)]">
      <div className="grid lg:grid-cols-12 gap-gap items-end mb-12">
        <SectionHead rise={rise} className="lg:col-span-6">{t('landing.privacy.title')}</SectionHead>
        <p className={`lg:col-start-8 lg:col-span-5 text-body-lg text-fg ${r.className}`} style={r.style}>{t('landing.privacy.desc')}</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-gap">
        {privacyItems.map(({ icon: Icon, key }, i) => {
          const p = pop(i);
          return (
            <div key={key} className={`tile tile-lift p-tile-dense flex gap-[14px] ${p.className}`} style={p.style}>
              <span className="w-12 h-12 shrink-0 rounded-icon bg-inner text-brand-text flex items-center justify-center" aria-hidden="true">
                <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h3 className="text-h3 font-bold text-fg mb-1">{t(`landing.privacy.items.${key}.title`)}</h3>
                <p className="text-body text-fg">{t(`landing.privacy.items.${key}.desc`)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PricingPreviewSection({ t }) {
  const { ref, rise, pop } = useSectionReveal();
  const freeItems = ['tx','budgets','goals','categories','reports','networth','healthscore'];
  const premiumItems = ['unlimited','cashflow','healthscore','benchmarks','splits','notifications'];
  const free = pop(0);
  const prem = pop(1);
  const r = rise(2);
  return (
    <section ref={ref} id="pricing-preview" className="max-w-content mx-auto pb-[clamp(80px,9vw,120px)]">
      <div className="tile-inner rounded-hero p-[clamp(28px,5vw,64px)]">
        <SectionHead rise={rise}>{t('landing.pricingPreview.title')}</SectionHead>
        <div className="mt-9 grid lg:grid-cols-2 gap-gap">
          {/* Free */}
          <div className={`tile tile-lift p-tile-dense sm:p-tile ${free.className}`} style={free.style}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-h3-lg font-bold text-fg">{t('landing.pricingPreview.free.label')}</h3>
              <p className="text-h1 font-extrabold tabular-nums text-fg">{t('pricing.free')}</p>
            </div>
            <ul className="mt-5 flex flex-col gap-2.5">
              {freeItems.map(key => (
                <li key={key} className="flex items-center gap-2.5 text-body font-semibold text-fg">
                  <Check className="w-[18px] h-[18px] text-brand-text shrink-0" strokeWidth={2.6} aria-hidden="true" />
                  {t(`landing.pricingPreview.free.items.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          {/* Premium: the hero tile */}
          <div className={`tile tile-hero tile-lift p-tile-dense sm:p-tile ${prem.className}`} style={prem.style}>
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
            <ul className="mt-5 flex flex-col gap-2.5">
              {premiumItems.map(key => (
                <li key={key} className="flex items-center gap-2.5 text-body font-semibold">
                  <Check className="w-[18px] h-[18px] shrink-0" strokeWidth={2.6} style={{ color: 'var(--toast-check)' }} aria-hidden="true" />
                  {t(`landing.pricingPreview.premium.items.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className={`mt-8 flex flex-col sm:flex-row sm:items-center gap-3 ${r.className}`} style={r.style}>
          <Link
            to="/pricing"
            className="group btn-motion btn-lift inline-flex items-center justify-center gap-2.5 min-h-[52px] px-7 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-pill text-body-lg"
          >
            {t('landing.pricingPreview.cta')}
            <ArrowRight className="arrow-nudge w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden="true" />
          </Link>
          <p className="text-sm font-semibold text-fg">{t('landing.pricingPreview.trial')}</p>
        </div>
      </div>
    </section>
  );
}

function FounderSection({ t }) {
  const { ref, pop } = useSectionReveal();
  const p = pop(0);
  return (
    <section ref={ref} aria-label={t('landing.founder.eyebrow')} className="max-w-content mx-auto pb-[clamp(64px,8vw,96px)]">
      <figure className={`tile p-[clamp(28px,5vw,56px)] max-w-3xl ${p.className}`} style={p.style}>
        <blockquote className="text-h3-lg font-bold text-fg">
          &ldquo;{t('landing.founder.quote')}&rdquo;
        </blockquote>
        <figcaption className="mt-8 flex items-center gap-4">
          <span className="w-12 h-12 rounded-icon bg-brand-600 flex items-center justify-center text-white font-extrabold text-body-lg shrink-0" aria-hidden="true">M</span>
          <span>
            <span className="block font-bold text-fg">{t('landing.founder.name')}</span>
            <span className="block text-sm font-semibold text-fg">{t('landing.founder.role')}</span>
          </span>
        </figcaption>
      </figure>
    </section>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line last:border-0">
      <button
        type="button"
        className="w-full min-h-11 flex items-center justify-between gap-4 py-5 text-left group"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="font-bold text-body-lg text-fg">{q}</span>
        <span className="w-11 h-11 shrink-0 rounded-pill bg-inner flex items-center justify-center text-fg btn-motion group-hover:bg-inner-2" aria-hidden="true">
          <ChevronDown className={`plus-spin w-5 h-5 ${open ? 'rotate-180' : ''}`} strokeWidth={2.4} />
        </span>
      </button>
      {open && (
        <p className="pb-5 text-body-lg text-fg animate-rise">{a}</p>
      )}
    </div>
  );
}

function FaqSection({ t }) {
  const { ref, rise, pop } = useSectionReveal();
  const p = pop(0);
  return (
    <section ref={ref} aria-label={t('landing.faq.eyebrow')} className="max-w-content mx-auto pb-[clamp(64px,8vw,96px)]">
      <div className="grid lg:grid-cols-12 gap-gap items-start">
        <SectionHead rise={rise} className="lg:col-span-4">{t('landing.faq.title')}</SectionHead>
        <div className={`tile px-tile-dense sm:px-tile py-2 lg:col-span-8 ${p.className}`} style={p.style}>
          {FAQ_KEYS.map(key => (
            <FaqItem key={key} q={t(`landing.faq.items.${key}.q`)} a={t(`landing.faq.items.${key}.a`)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ToolsSection({ t }) {
  const { i18n } = useTranslation();
  const { ref, rise, pop } = useSectionReveal();
  const p = pop(0);
  return (
    <section ref={ref} aria-label={t('landing.tools.eyebrow')} className="max-w-content mx-auto pb-[clamp(64px,8vw,96px)]">
      <div className={`tile p-[clamp(28px,5vw,56px)] ${p.className}`} style={p.style}>
        <div className="grid lg:grid-cols-12 gap-gap items-end">
          <SectionHead rise={rise} className="lg:col-span-6">{t('landing.tools.title')}</SectionHead>
          <p className="lg:col-start-8 lg:col-span-5 text-body-lg text-fg">{t('landing.tools.desc')}</p>
        </div>
        {/* Maps over TOOLS so a new tool appears here with no edit to this file.
            First tool is the primary pill; the rest are secondary. Buttons
            size to their labels (Albanian labels vary a lot in length). */}
        <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-3">
          {TOOLS.map((tool, i) => (
            <Link
              key={tool.path}
              to={toolPath(tool.path, i18n.language)}
              className={`group btn-motion btn-lift inline-flex w-full sm:w-auto items-center justify-center gap-2 whitespace-nowrap min-h-[52px] px-6 text-body font-bold rounded-pill border-2 ${
                i === 0
                  ? 'bg-brand-600 hover:bg-brand-700 border-brand-600 hover:border-brand-700 text-white'
                  : 'bg-tile border-fg text-fg hover:bg-fg hover:text-tile'
              }`}
            >
              {t(tool.labelKey)}
              <ArrowRight className="arrow-nudge w-[18px] h-[18px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection({ t, lang }) {
  const { ref, rise } = useSectionReveal();
  const r1 = rise(1);
  const r2 = rise(2);
  return (
    <section ref={ref} className="max-w-content mx-auto pb-[clamp(80px,9vw,120px)]">
      <div className="tile-inner rounded-hero p-[clamp(28px,6vw,80px)]">
        <SectionHead rise={rise} className="max-w-2xl">{t('landing.finalCta.title')}</SectionHead>
        <p className={`mt-5 text-body-lg text-fg max-w-xl ${r1.className}`} style={r1.style}>{t('landing.finalCta.desc')}</p>
        <div className={`mt-8 flex flex-col sm:flex-row sm:items-center gap-3 ${r2.className}`} style={r2.style}>
          <Link
            to={localizedPath('/register', lang)}
            className="group btn-motion btn-lift inline-flex items-center justify-center gap-2.5 min-h-[52px] px-7 border-2 border-brand-600 bg-brand-600 hover:bg-brand-700 hover:border-brand-700 text-white font-bold rounded-pill text-body-lg"
          >
            {t('landing.finalCta.button')}
            <ArrowRight className="arrow-nudge w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden="true" />
          </Link>
          <Link
            to={localizedPath('/pricing', lang)}
            className="btn-motion btn-lift inline-flex items-center justify-center min-h-[52px] px-7 rounded-pill border-2 border-fg bg-tile text-fg hover:bg-fg hover:text-tile font-bold text-body-lg"
          >
            {t('landing.finalCta.secondary')}
          </Link>
        </div>
        <p className={`mt-6 text-sm font-semibold text-fg ${r2.className}`} style={r2.style}>{t('landing.finalCta.trustLine')}</p>
      </div>
    </section>
  );
}
