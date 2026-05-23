import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import showcaseImg from '../assets/showcase-finance.jpg';
import { useMetaTags } from '../hooks/useMetaTags';
import {
  TrendingUp, Target, PieChart, Activity, RefreshCw,
  Globe, BarChart3, Bell, Tag, FileText, Heart,
  ArrowRight, CheckCircle2, Zap,
} from 'lucide-react';

/* ─── Hero dashboard mockup ─── */
function DashboardPreview({ t }) {
  return (
    <div className="relative">
      <div className="relative bg-white dark:bg-surface-dark-elevated rounded-2xl border border-surface-hairline dark:border-surface-dark-hairline shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-hairline dark:border-surface-dark-hairline">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline" />
            <span className="w-2 h-2 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline" />
            <span className="w-2 h-2 rounded-md bg-brand-600 dark:bg-brand-700" />
          </div>
          <span className="text-[11px] text-ink-muted dark:text-white ml-2 font-medium tracking-wide">
            {t('landing.mockup.dashboard')}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 px-5 pt-5 pb-4">
          <div>
            <p className="eyebrow text-[10px] mb-1">{t('landing.mockup.balance')}</p>
            <p className="text-lg font-bold text-ink-primary dark:text-white tabular-nums">€1,353</p>
          </div>
          <div>
            <p className="eyebrow text-[10px] mb-1">{t('landing.mockup.income')}</p>
            <p className="text-lg font-bold text-brand-600 dark:text-brand-700 tabular-nums">+€3,200</p>
          </div>
          <div>
            <p className="eyebrow text-[10px] mb-1">{t('landing.mockup.expenses')}</p>
            <p className="text-lg font-bold text-[#be3232] dark:text-[#be3232] tabular-nums">-€1,847</p>
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-end gap-[5px] h-14">
            {[35, 58, 42, 72, 50, 64, 85, 55, 68, 78, 46, 90].map((h, i) => (
              <div key={i} className="flex-1 rounded-[3px] bg-brand-700/70 dark:bg-brand-700/60" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-ink-muted dark:text-white font-medium">{t('landing.mockup.budget')}</span>
            <span className="text-ink-muted dark:text-white tabular-nums">60%</span>
          </div>
          <div className="h-1.5 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full overflow-hidden">
            <div className="h-full bg-brand-700 rounded-md" style={{ width: '60%' }} />
          </div>
        </div>

        <div className="border-t border-surface-hairline dark:border-surface-dark-hairline px-5 py-3">
          <p className="eyebrow text-[10px] mb-2">{t('landing.mockup.recent')}</p>
          {[
            { color: '#be3232', label: t('landing.mockup.coffee'), amount: '-€4.50', positive: false },
            { color: '#168b78', label: t('landing.mockup.salary'), amount: '+€3,200', positive: true },
            { color: '#6A8FC4', label: t('landing.mockup.rent'), amount: '-€850.00', positive: false },
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tx.color }} />
                <span className="text-xs text-ink-primary dark:text-white">{tx.label}</span>
              </div>
              <span className={`text-xs font-semibold tabular-nums ${tx.positive ? 'text-brand-700 dark:text-brand-700' : 'text-[#be3232] dark:text-[#be3232]'}`}>
                {tx.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ Bento card shell ═══ */
function Bento({ className = '', icon: Icon, title, desc }) {
  return (
    <div className={`p-7 sm:p-8 border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card rounded-[10px] flex flex-col gap-6 ${className}`}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-600 flex-shrink-0">
        <Icon className="w-7 h-7" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-ink-primary dark:text-white leading-tight mb-2">
          {title}
        </h3>
        <p className="text-sm text-ink-muted dark:text-white leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ─── Flagship feature card ─── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const INCOME_BARS  = [3200, 3200, 3400, 3200, 3600, 3200, 3500, 3200, 3400, 3200, 3600, 3800];
const EXPENSE_BARS = [1600, 1900, 1500, 2100, 1700, 1400, 1800, 1500, 1650, 1300, 1750, 1400];
const BAR_MAX = 4000;

function FlagshipCard({ t }) {
  const netSavings = INCOME_BARS.reduce((s, v, i) => s + v - EXPENSE_BARS[i], 0);
  return (
    <div className="mb-5 border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card rounded-[10px] overflow-hidden">
      <div className="grid lg:grid-cols-[2fr_3fr]">
        {/* Left: copy */}
        <div className="p-8 sm:p-10 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-surface-hairline dark:border-surface-dark-hairline">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-600 mb-6">
            <TrendingUp className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <h3 className="text-3xl sm:text-4xl font-semibold text-ink-primary dark:text-white leading-tight mb-4">
            {t('landing.features.tracking.title')}
          </h3>
          <p className="text-base text-ink-muted dark:text-white leading-relaxed mb-6">
            {t('landing.features.tracking.desc')}
          </p>
          <div className="flex gap-6">
            <div>
              <p className="eyebrow text-[10px] mb-1">{t('landing.mockup.income')}</p>
              <p className="text-2xl font-semibold text-brand-600 dark:text-brand-700 tabular-nums">€{(INCOME_BARS.reduce((s,v)=>s+v,0)/1000).toFixed(1)}k</p>
            </div>
            <div>
              <p className="eyebrow text-[10px] mb-1">{t('landing.mockup.expenses')}</p>
              <p className="text-2xl font-semibold text-[#d12323] dark:text-[#be3232] tabular-nums">€{(EXPENSE_BARS.reduce((s,v)=>s+v,0)/1000).toFixed(1)}k</p>
            </div>
            <div>
              <p className="eyebrow text-[10px] mb-1">{t('landing.viz.ytdSavings')}</p>
              <p className="text-2xl font-semibold text-ink-primary dark:text-white tabular-nums">+€{(netSavings/1000).toFixed(1)}k</p>
            </div>
          </div>
        </div>

        {/* Right: bar chart */}
        <div className="p-6 sm:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold text-ink-primary dark:text-white">2025 - {t('landing.viz.ytdSavings')}</p>
            <div className="flex items-center gap-4 text-xs text-ink-muted dark:text-white">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-600 inline-block" />{t('landing.mockup.income')}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#d12323] inline-block" />{t('landing.mockup.expenses')}</span>
            </div>
          </div>
          <div className="flex-1 flex items-end gap-1.5">
            {MONTHS.map((m, i) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex flex-col items-center gap-[3px]">
                  <div
                    className="w-full rounded-t-[3px] bg-brand-600/80 dark:bg-brand-700/70 transition-all"
                    style={{ height: `${(INCOME_BARS[i] / BAR_MAX) * 120}px` }}
                  />
                  <div
                    className="w-full rounded-t-[3px] bg-[#d12323]/70 dark:bg-[#d12323]/60 transition-all"
                    style={{ height: `${(EXPENSE_BARS[i] / BAR_MAX) * 120}px` }}
                  />
                </div>
                <span className="text-[9px] text-ink-muted dark:text-white mt-1 hidden sm:block">{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const isSq = (i18n.language || '').toLowerCase().startsWith('sq');

  useMetaTags({
    title: t('meta.title'),
    description: t('meta.description'),
    canonical: isSq ? 'https://personal-finances.app/sq' : 'https://personal-finances.app/',
  });

  const steps = [
    { num: 1, key: 'step1' },
    { num: 2, key: 'step2' },
    { num: 3, key: 'step3' },
  ];

  const bentoFeatures = [
    { key: 'healthscore',    icon: Heart,       col: 'lg:col-span-4' },
    { key: 'goals',          icon: Target,      col: 'lg:col-span-4' },
    { key: 'networth',       icon: TrendingUp,  col: 'lg:col-span-4' },
    { key: 'budgets',        icon: PieChart,    col: 'lg:col-span-6' },
    { key: 'charts',         icon: BarChart3,   col: 'lg:col-span-6' },
    { key: 'cashflow',       icon: Activity,    col: 'lg:col-span-4' },
    { key: 'recurring',      icon: RefreshCw,   col: 'lg:col-span-4' },
    { key: 'multicurrency',  icon: Globe,       col: 'lg:col-span-4' },
    { key: 'benchmarks',     icon: Zap,         col: 'lg:col-span-6' },
    { key: 'notifications',  icon: Bell,        col: 'lg:col-span-6' },
    { key: 'categories',     icon: Tag,         col: 'lg:col-span-8' },
    { key: 'reports',        icon: FileText,    col: 'lg:col-span-4' },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-24 sm:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <h1 className="text-6xl sm:text-7xl lg:text-[5.5rem] font-semibold text-ink-primary dark:text-white leading-[1.02] mb-7">
              {t('landing.hero.titleLine1')}{' '}
              <span className="text-brand-600 dark:text-brand-700">{t('landing.hero.titleAccent')}</span>
            </h1>

            <p className="text-2xl text-ink-muted dark:text-white leading-relaxed mb-10 max-w-xl">
              {t('landing.hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-700 hover:bg-brand-700 text-white font-medium rounded-md transition-colors text-base"
              >
                {t('landing.hero.getStarted')}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-4 border border-ink-primary/25 hover:border-ink-primary/60 dark:border-ink-dark-primary/25 dark:hover:border-ink-dark-primary/60 text-ink-primary dark:text-white font-medium rounded-md transition-colors text-base"
              >
                {t('landing.hero.signIn')}
              </Link>
            </div>

            <p className="text-base text-ink-muted dark:text-white">
              {t('landing.hero.trustNote')}
            </p>
          </div>

          <div className="relative">
            <DashboardPreview t={t} />
            <div aria-hidden="true" className="hidden lg:block absolute -top-3 -right-3 w-24 h-24 border-t-2 border-r-2 border-brand-500/40 rounded-tr-2xl pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── Product Stats ── */}
      <section className="border-y border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { value: '30',   label: t('landing.stats.freeTransactions') },
              { value: '10+',  label: t('landing.stats.features') },
              { value: '24/7', label: t('landing.stats.cloudSync') },
              { value: '100%', label: t('landing.stats.free') },
            ].map((stat, i) => (
              <div
                key={i}
                className={`px-5 py-2 ${i > 0 ? 'border-l border-surface-hairline dark:border-surface-dark-hairline' : ''}`}
              >
                <p className="text-6xl sm:text-7xl font-semibold text-ink-primary dark:text-white tabular-nums leading-none">
                  {stat.value}
                </p>
                <p className="mt-4 text-base font-medium text-ink-muted dark:text-white leading-snug">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Bento Grid ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-3xl">
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-ink-primary dark:text-white leading-[1.05] mb-5">
              {t('landing.features.title')}
            </h2>
            <p className="text-xl text-ink-muted dark:text-white leading-relaxed">
              {t('landing.cta.subtitle')}
            </p>
          </div>

          {/* Flagship card */}
          <FlagshipCard t={t} />

          {/* Feature bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {bentoFeatures.map(({ key, icon, col }) => (
              <Bento
                key={key}
                className={col}
                icon={icon}
                title={t(`landing.features.${key}.title`)}
                desc={t(`landing.features.${key}.desc`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative border-y border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card py-20 sm:py-28 overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-3xl flex gap-5">
            <div aria-hidden="true" className="w-1 bg-brand-600 rounded-md flex-shrink-0 my-2" />
            <div>
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-ink-primary dark:text-white leading-[1.05] mb-5">
                {t('landing.howItWorks.title')}
              </h2>
              <p className="text-xl text-ink-muted dark:text-white">
                {t('landing.howItWorks.subtitle')}
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-10 md:gap-12 relative">
            <div aria-hidden="true" className="hidden md:block absolute top-6 left-[8%] right-[8%] h-px border-t border-dashed border-brand-500/30 pointer-events-none" />
            {steps.map((step) => (
              <div key={step.key} className="relative">
                <div className="mb-6 relative bg-white dark:bg-surface-dark-card inline-block">
                  <span className="w-12 h-12 rounded-md bg-brand-600 text-white flex items-center justify-center text-base font-semibold tabular-nums shadow-[0_0_0_6px_rgba(34,173,147,0.12)]">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-2xl font-semibold text-ink-primary dark:text-white leading-tight mb-3">
                  {t(`landing.howItWorks.${step.key}.title`)}
                </h3>
                <p className="text-lg text-ink-muted dark:text-white leading-relaxed">
                  {t(`landing.howItWorks.${step.key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex gap-5">
              <div aria-hidden="true" className="w-1 bg-brand-600 rounded-md flex-shrink-0 my-2" />
              <div className="flex-1">
                <h2 className="text-5xl sm:text-6xl font-semibold text-ink-primary dark:text-white leading-[1.05] mb-5">
                  {t('landing.showcase.title')}
                </h2>
                <p className="text-xl text-ink-muted dark:text-white leading-relaxed mb-8">
                  {t('landing.showcase.desc')}
                </p>
                <ul className="space-y-4">
                  {['showcase1', 'showcase2', 'showcase3'].map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <CheckCircle2 className="flex-shrink-0 w-5 h-5 text-brand-600 mt-0.5" strokeWidth={2} />
                      <span className="text-lg text-ink-primary dark:text-white">{t(`landing.showcase.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="relative">
              <div aria-hidden="true" className="absolute -top-3 -left-3 w-20 h-20 border-t-2 border-l-2 border-brand-600 rounded-tl-xl pointer-events-none" />
              <div aria-hidden="true" className="absolute -bottom-3 -right-3 w-20 h-20 border-b-2 border-r-2 border-brand-600 rounded-br-xl pointer-events-none" />
              <div className="relative rounded-xl overflow-hidden border border-surface-hairline dark:border-surface-dark-hairline shadow-lg">
                <img
                  src={showcaseImg}
                  alt={t('landing.showcase.imageAlt')}
                  width={800}
                  height={533}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative border-t border-surface-hairline dark:border-surface-dark-hairline bg-gradient-to-br from-white via-brand-50/40 to-white dark:from-surface-dark-card dark:via-brand-950/20 dark:to-surface-dark-card py-24 sm:py-32 overflow-hidden">
        <div aria-hidden="true" className="absolute top-8 left-8 w-16 h-16 border-t border-l border-brand-600/30 rounded-tl-2xl pointer-events-none" />
        <div aria-hidden="true" className="absolute bottom-8 right-8 w-16 h-16 border-b border-r border-brand-600/30 rounded-br-2xl pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-brand-600/10 text-brand-700 dark:text-brand-300 text-xs font-semibold uppercase tracking-[0.14em] mb-6 border border-brand-600/20">
            <span className="w-1.5 h-1.5 rounded-md bg-brand-600" />
            {t('landing.hero.badge').split('·')[0].trim()}
          </div>
          <h2 className="text-5xl sm:text-6xl font-semibold text-ink-primary dark:text-white leading-[1.05] mb-5">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-ink-muted dark:text-white leading-relaxed max-w-lg mx-auto">
            {t('landing.cta.subtitle')}
          </p>
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 mt-10 px-9 py-4 bg-brand-700 hover:bg-brand-700 text-white font-medium rounded-md transition-all text-base shadow-lg shadow-brand-600/20 hover:shadow-xl hover:shadow-brand-600/30"
          >
            {t('landing.cta.button')}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
          </Link>
          <p className="mt-6 text-sm text-ink-muted dark:text-white">
            {t('landing.hero.trustNote')}
          </p>
        </div>
      </section>
    </div>
  );
}
