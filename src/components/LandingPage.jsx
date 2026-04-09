import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import showcaseImg from '../assets/showcase-finance.jpg';

/* ─── Mini dashboard mockup for the hero ─── */
function DashboardPreview({ t }) {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-brand-400/10 dark:bg-brand-500/5 rounded-3xl blur-2xl pointer-events-none" />
      <div className="relative bg-white dark:bg-surface-dark-elevated rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-xl overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-zinc-800/80">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-2 font-medium tracking-wide">
            {t('landing.mockup.dashboard')}
          </span>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4 px-5 pt-5 pb-4">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{t('landing.mockup.balance')}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">€1,353</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{t('landing.mockup.income')}</p>
            <p className="text-lg font-bold text-brand-600 dark:text-brand-400 tabular-nums">+€3,200</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{t('landing.mockup.expenses')}</p>
            <p className="text-lg font-bold text-red-500 dark:text-red-400 tabular-nums">-€1,847</p>
          </div>
        </div>

        {/* Mini bar chart */}
        <div className="px-5 pb-4">
          <div className="flex items-end gap-[5px] h-14">
            {[35, 58, 42, 72, 50, 64, 85, 55, 68, 78, 46, 90].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-[3px] bg-brand-500/70 dark:bg-brand-400/60"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Budget bar */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-gray-500 dark:text-gray-400 font-medium">{t('landing.mockup.budget')}</span>
            <span className="text-gray-400 dark:text-gray-500 tabular-nums">60%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: '60%' }} />
          </div>
        </div>

        {/* Recent transactions */}
        <div className="border-t border-gray-100 dark:border-zinc-800/80 px-5 py-3">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('landing.mockup.recent')}</p>
          {[
            { emoji: '☕', label: t('landing.mockup.coffee'), amount: '-€4.50', positive: false },
            { emoji: '💰', label: t('landing.mockup.salary'), amount: '+€3,200', positive: true },
            { emoji: '🏠', label: t('landing.mockup.rent'), amount: '-€850.00', positive: false },
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">{tx.emoji}</span>
                <span className="text-xs text-gray-600 dark:text-gray-300">{tx.label}</span>
              </div>
              <span className={`text-xs font-semibold tabular-nums ${tx.positive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {tx.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Feature icons (Heroicons outline 24×24) ─── */
const featureIcons = {
  tracking: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  ),
  charts: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
    </svg>
  ),
  budgets: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  goals: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  ),
  recurring: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
    </svg>
  ),
  multicurrency: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
};

export default function LandingPage() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(id);
  }, []);

  const features = ['tracking', 'charts', 'budgets', 'goals', 'recurring', 'multicurrency'];

  const steps = [
    { num: '1', key: 'step1' },
    { num: '2', key: 'step2' },
    { num: '3', key: 'step3' },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16 sm:pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Copy */}
          <div className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-xs font-medium mb-6 border border-brand-200/60 dark:border-brand-800/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
              </span>
              {t('landing.hero.badge')}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-gray-900 dark:text-white tracking-display leading-[1.1] mb-5">
              {t('landing.hero.titleLine1')}{' '}
              <span className="text-brand-600 dark:text-brand-400">{t('landing.hero.titleAccent')}</span>
            </h1>

            <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-lg">
              {t('landing.hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm transition-all active:scale-[0.98] text-sm"
              >
                {t('landing.hero.getStarted')}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-3 bg-white dark:bg-surface-dark-elevated border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg shadow-xs transition-all text-sm"
              >
                {t('landing.hero.signIn')}
              </Link>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('landing.hero.trustNote')}
            </p>
          </div>

          {/* Dashboard Mockup */}
          <div className={`transition-all duration-700 delay-150 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <DashboardPreview t={t} />
          </div>
        </div>
      </section>

      {/* ── Product Stats ── */}
      <section className="border-y border-gray-200/60 dark:border-zinc-800 bg-white dark:bg-surface-dark-secondary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '30', label: t('landing.stats.freeTransactions') },
              { value: '10+', label: t('landing.stats.features') },
              { value: '24/7', label: t('landing.stats.cloudSync') },
              { value: '100%', label: t('landing.stats.free') },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{stat.value}</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">
              {t('landing.features.title')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              {t('landing.cta.subtitle')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((key) => (
              <div
                key={key}
                className="group p-6 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-surface-dark-tertiary hover:border-brand-300 dark:hover:border-brand-800/60 hover:shadow-md transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 group-hover:scale-110 transition-transform">
                  {featureIcons[key]}
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">
                  {t(`landing.features.${key}.title`)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t(`landing.features.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-y border-gray-200/60 dark:border-zinc-800 bg-white dark:bg-surface-dark-secondary py-20 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">
              {t('landing.howItWorks.title')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t('landing.howItWorks.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.key} className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-5">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t(`landing.howItWorks.${step.key}.title`)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {t(`landing.howItWorks.${step.key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase (Image + text) ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">
                {t('landing.showcase.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                {t('landing.showcase.desc')}
              </p>
              <ul className="space-y-3">
                {['showcase1', 'showcase2', 'showcase3'].map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t(`landing.showcase.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 dark:border-zinc-800">
              <img
                src={showcaseImg}
                alt={t('landing.showcase.imageAlt')}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-gray-200/60 dark:border-zinc-800 bg-white dark:bg-surface-dark-secondary py-20 sm:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">
            {t('landing.cta.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {t('landing.cta.subtitle')}
          </p>
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm transition-all active:scale-[0.98] text-sm"
          >
            {t('landing.cta.button')}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            {t('landing.hero.trustNote')}
          </p>
        </div>
      </section>
    </div>
  );
}
