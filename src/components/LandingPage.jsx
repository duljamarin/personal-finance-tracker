import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import showcaseImg from '../assets/showcase-finance.jpg';

/* ─── Flagship hero illustration with brand accent ─── */
function FlagshipArt() {
  return (
    <svg viewBox="0 0 240 140" className="w-full h-auto" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="128" x2="232" y2="128" className="stroke-ink-primary/25 dark:stroke-ink-dark-primary/25" />
      <line x1="8" y1="96"  x2="232" y2="96"  className="stroke-ink-primary/15 dark:stroke-ink-dark-primary/15" strokeDasharray="2 3" />
      <line x1="8" y1="64"  x2="232" y2="64"  className="stroke-ink-primary/15 dark:stroke-ink-dark-primary/15" strokeDasharray="2 3" />
      <line x1="8" y1="32"  x2="232" y2="32"  className="stroke-ink-primary/15 dark:stroke-ink-dark-primary/15" strokeDasharray="2 3" />
      <path d="M8 104 L40 96 L72 100 L104 84 L136 78 L168 62 L200 68 L232 40"
            className="stroke-ink-primary/40 dark:stroke-ink-dark-primary/40" />
      <path d="M8 112 L40 98 L72 108 L104 80 L136 88 L168 50 L200 58 L232 22"
            stroke="#22ad93" strokeWidth="2" />
      <circle cx="40"  cy="98" r="2.2" fill="#22ad93" />
      <circle cx="104" cy="80" r="2.2" fill="#22ad93" />
      <circle cx="168" cy="50" r="2.2" fill="#22ad93" />
      <circle cx="232" cy="22" r="3"   fill="#22ad93" />
    </svg>
  );
}

/* ─── Hero dashboard mockup ─── */
function DashboardPreview({ t }) {
  return (
    <div className="relative">
      <div className="relative bg-white dark:bg-surface-dark-elevated rounded-2xl border border-surface-hairline dark:border-surface-dark-hairline shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-hairline dark:border-surface-dark-hairline">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline" />
            <span className="w-2 h-2 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline" />
            <span className="w-2 h-2 rounded-full bg-brand-300 dark:bg-brand-700" />
          </div>
          <span className="text-[11px] text-ink-muted dark:text-ink-dark-muted ml-2 font-medium tracking-wide">
            {t('landing.mockup.dashboard')}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 px-5 pt-5 pb-4">
          <div>
            <p className="eyebrow text-[10px] mb-1">{t('landing.mockup.balance')}</p>
            <p className="text-lg font-bold text-ink-primary dark:text-ink-dark-primary tabular-nums">€1,353</p>
          </div>
          <div>
            <p className="eyebrow text-[10px] mb-1">{t('landing.mockup.income')}</p>
            <p className="text-lg font-bold text-brand-600 dark:text-brand-400 tabular-nums">+€3,200</p>
          </div>
          <div>
            <p className="eyebrow text-[10px] mb-1">{t('landing.mockup.expenses')}</p>
            <p className="text-lg font-bold text-[#e05c6b] dark:text-[#f08090] tabular-nums">-€1,847</p>
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-end gap-[5px] h-14">
            {[35, 58, 42, 72, 50, 64, 85, 55, 68, 78, 46, 90].map((h, i) => (
              <div key={i} className="flex-1 rounded-[3px] bg-brand-500/70 dark:bg-brand-400/60" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-ink-muted dark:text-ink-dark-muted font-medium">{t('landing.mockup.budget')}</span>
            <span className="text-ink-muted dark:text-ink-dark-muted tabular-nums">60%</span>
          </div>
          <div className="h-1.5 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: '60%' }} />
          </div>
        </div>

        <div className="border-t border-surface-hairline dark:border-surface-dark-hairline px-5 py-3">
          <p className="eyebrow text-[10px] mb-2">{t('landing.mockup.recent')}</p>
          {[
            { color: '#e05c6b', label: t('landing.mockup.coffee'), amount: '-€4.50', positive: false },
            { color: '#168b78', label: t('landing.mockup.salary'), amount: '+€3,200', positive: true },
            { color: '#6A8FC4', label: t('landing.mockup.rent'), amount: '-€850.00', positive: false },
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tx.color }} />
                <span className="text-xs text-ink-primary dark:text-ink-dark-primary">{tx.label}</span>
              </div>
              <span className={`text-xs font-semibold tabular-nums ${tx.positive ? 'text-brand-600 dark:text-brand-400' : 'text-[#e05c6b] dark:text-[#f08090]'}`}>
                {tx.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ Per-feature in-card micro visualizations ═══ */

const MV_Charts = ({ t }) => {
  const rows = [
    { label: t('landing.categories.food'),          pct: 72, amt: '€820' },
    { label: t('landing.categories.transport'),     pct: 48, amt: '€340' },
    { label: t('landing.categories.entertainment'), pct: 31, amt: '€210' },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-ink-muted dark:text-ink-dark-muted">{r.label}</span>
            <span className="text-xs font-semibold text-ink-primary dark:text-ink-dark-primary tabular-nums">{r.amt}</span>
          </div>
          <div className="h-1.5 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const MV_Budgets = ({ t }) => {
  const rows = [
    { label: t('landing.categories.food'),       pct: 78, tone: 'brand' },
    { label: t('landing.categories.utilities'),  pct: 45, tone: 'brand' },
    { label: t('landing.categories.transport'),  pct: 92, tone: 'warn'  },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-ink-muted dark:text-ink-dark-muted">{r.label}</span>
            <span className={`text-xs font-semibold tabular-nums ${r.tone === 'warn' ? 'text-amber-500' : 'text-ink-primary dark:text-ink-dark-primary'}`}>{r.pct}%</span>
          </div>
          <div className="h-1.5 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${r.tone === 'warn' ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const MV_Healthscore = ({ t }) => (
  <div className="flex items-center gap-5">
    <svg viewBox="0 0 100 60" className="w-28 h-16">
      <path d="M 10 52 A 40 40 0 0 1 90 52" fill="none" stroke="#EDEDE8" strokeWidth="6" className="dark:stroke-surface-dark-hairline" />
      <path d="M 10 52 A 40 40 0 0 1 82 28" fill="none" stroke="#22ad93" strokeWidth="6" strokeLinecap="round" />
    </svg>
    <div>
      <p className="text-4xl font-semibold text-ink-primary dark:text-ink-dark-primary tabular-nums tracking-tight-display leading-none">85</p>
      <p className="eyebrow text-[10px] text-brand-600 dark:text-brand-400 mt-1.5">{t('landing.viz.scoreGood')}</p>
    </div>
  </div>
);

const MV_Goals = ({ t }) => (
  <div>
    <div className="flex items-baseline justify-between mb-3">
      <p className="text-4xl font-semibold text-ink-primary dark:text-ink-dark-primary tabular-nums tracking-tight-display leading-none">73%</p>
      <span className="eyebrow text-[10px]">{t('landing.viz.goalName')}</span>
    </div>
    <div className="h-2 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full overflow-hidden mb-2">
      <div className="h-full bg-brand-500 rounded-full" style={{ width: '73%' }} />
    </div>
    <p className="text-xs text-ink-muted dark:text-ink-dark-muted tabular-nums">€3,650 / €5,000</p>
  </div>
);

const MV_Networth = () => (
  <div>
    <div className="flex items-baseline gap-3 mb-2">
      <p className="text-3xl font-semibold text-ink-primary dark:text-ink-dark-primary tabular-nums tracking-tight-display leading-none">€24,580</p>
      <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 tabular-nums">+12%</span>
    </div>
    <svg viewBox="0 0 160 40" className="w-full h-10" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 32 L20 28 L40 24 L60 22 L80 16 L100 14 L120 10 L140 8 L160 4 L160 40 L0 40 Z" fill="#22ad93" fillOpacity="0.15" />
      <path d="M0 32 L20 28 L40 24 L60 22 L80 16 L100 14 L120 10 L140 8 L160 4" stroke="#22ad93" strokeWidth="1.5" />
    </svg>
  </div>
);

const MV_Cashflow = ({ t }) => (
  <div>
    <div className="flex items-baseline gap-3 mb-2">
      <p className="text-3xl font-semibold text-brand-600 dark:text-brand-400 tabular-nums tracking-tight-display leading-none">+€1,247</p>
      <span className="eyebrow text-[10px]">{t('landing.viz.nextDays')}</span>
    </div>
    <svg viewBox="0 0 160 40" className="w-full h-10" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
      <line x1="80" y1="0" x2="80" y2="40" className="stroke-ink-primary/15 dark:stroke-ink-dark-primary/15" strokeDasharray="2 3" />
      <path d="M0 30 L16 28 L32 24 L48 26 L64 20 L80 22" stroke="#22ad93" />
      <path d="M80 22 L96 18 L112 20 L128 14 L144 12 L160 8" stroke="#22ad93" strokeDasharray="3 3" />
      <circle cx="80" cy="22" r="2.5" fill="#22ad93" />
    </svg>
  </div>
);

const MV_Recurring = ({ t }) => {
  const dots = new Set([1, 3, 8, 15, 22, 25]);
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className={`aspect-square rounded-[3px] flex items-center justify-center text-[9px] tabular-nums ${
              dots.has(i)
                ? 'bg-brand-500 text-white'
                : 'bg-surface-hairline/60 dark:bg-surface-dark-hairline/60 text-ink-muted/60 dark:text-ink-dark-muted/60'
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-muted dark:text-ink-dark-muted"><span className="font-semibold text-ink-primary dark:text-ink-dark-primary">6</span> {t('landing.viz.recurringThisMonth')}</p>
    </div>
  );
};

const MV_Benchmarks = ({ t }) => (
  <div className="space-y-4">
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-ink-primary dark:text-ink-dark-primary font-medium">{t('landing.viz.thisMonth')}</span>
        <span className="text-xs font-semibold text-ink-primary dark:text-ink-dark-primary tabular-nums">€1,847</span>
      </div>
      <div className="h-2.5 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full" style={{ width: '72%' }} />
      </div>
    </div>
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-ink-muted dark:text-ink-dark-muted">{t('landing.viz.avg3Month')}</span>
        <span className="text-xs font-semibold text-ink-muted dark:text-ink-dark-muted tabular-nums">€2,120</span>
      </div>
      <div className="h-2.5 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full overflow-hidden">
        <div className="h-full bg-ink-muted/40 dark:bg-ink-dark-muted/40 rounded-full" style={{ width: '88%' }} />
      </div>
    </div>
    <p className="text-xs"><span className="font-semibold text-brand-600 dark:text-brand-400">-13%</span> <span className="text-ink-muted dark:text-ink-dark-muted">{t('landing.viz.lowerThanAvg')}</span></p>
  </div>
);

const MV_Multicurrency = () => (
  <div className="flex items-center gap-4 flex-wrap">
    <div>
      <p className="eyebrow text-[10px] mb-1">EUR</p>
      <p className="text-2xl font-semibold text-ink-primary dark:text-ink-dark-primary tabular-nums tracking-tight-display leading-none">€1,000<span className="text-ink-muted">.00</span></p>
    </div>
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-brand-600 dark:text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
    <div>
      <p className="eyebrow text-[10px] mb-1">USD · 1.087</p>
      <p className="text-2xl font-semibold text-brand-600 dark:text-brand-400 tabular-nums tracking-tight-display leading-none">$1,087<span className="text-brand-600/70 dark:text-brand-400/70">.42</span></p>
    </div>
  </div>
);

const MV_Reports = ({ t }) => (
  <div className="flex items-center gap-4">
    <svg viewBox="0 0 48 48" className="w-14 h-14 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="6" width="32" height="36" rx="2" className="stroke-ink-primary dark:stroke-ink-dark-primary" strokeWidth="1.5" />
      <path d="M32 6 v6 h6" className="stroke-ink-primary dark:stroke-ink-dark-primary" strokeWidth="1.5" />
      <line x1="14" y1="18" x2="26" y2="18" className="stroke-ink-primary/60 dark:stroke-ink-dark-primary/60" strokeWidth="1.2" />
      <rect x="14" y="30" width="4" height="6" fill="#22ad93" />
      <rect x="21" y="26" width="4" height="10" fill="#22ad93" />
      <rect x="28" y="22" width="4" height="14" fill="#22ad93" />
    </svg>
    <div>
      <p className="text-sm font-semibold text-ink-primary dark:text-ink-dark-primary mb-1">2026 · Q1</p>
      <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{t('landing.viz.reportTypes')}</p>
    </div>
  </div>
);

const MV_Notifications = ({ t }) => {
  const alerts = [
    { text: t('landing.viz.alertTransport'), tone: 'warn' },
    { text: t('landing.viz.alertGoal'),      tone: 'brand' },
    { text: t('landing.viz.alertRent'),      tone: 'muted' },
  ];
  return (
    <div className="flex items-start gap-5">
      <div className="relative flex-shrink-0">
        <svg viewBox="0 0 40 40" className="w-10 h-10 text-ink-primary dark:text-ink-dark-primary" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 8 C14 8 13 12 13 18 L13 24 L10 28 L30 28 L27 24 L27 18 C27 12 26 8 20 8 Z" />
          <path d="M17 30 C18 32 22 32 23 30" />
        </svg>
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">3</span>
      </div>
      <div className="flex-1 space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.tone === 'warn' ? 'bg-amber-500' : a.tone === 'brand' ? 'bg-brand-500' : 'bg-ink-muted/50 dark:bg-ink-dark-muted/50'}`} />
            <span className="text-ink-primary dark:text-ink-dark-primary">{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MV_Categories = ({ t }) => {
  const pills = [
    { label: t('landing.categories.food'),          color: '#22ad93' },
    { label: t('landing.categories.transport'),     color: '#D0A96A' },
    { label: t('landing.categories.entertainment'), color: '#C46A75' },
    { label: t('landing.categories.utilities'),     color: '#6A8FC4' },
    { label: t('landing.mockup.rent'),              color: '#8A8A85' },
    { label: t('landing.mockup.coffee'),            color: '#C99060' },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((p, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-surface-dark-elevated border border-surface-hairline dark:border-surface-dark-hairline rounded-full text-xs text-ink-primary dark:text-ink-dark-primary"
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          {p.label}
        </span>
      ))}
    </div>
  );
};

const MV_Tracking = ({ t }) => (
  <div className="bg-surface-page dark:bg-surface-dark-page border border-surface-hairline dark:border-surface-dark-hairline p-5 sm:p-6 rounded-[10px] text-ink-primary dark:text-ink-dark-primary">
    <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
      <div>
        <p className="eyebrow text-[10px] mb-1">{t('landing.viz.ytdSavings')}</p>
        <p className="text-3xl sm:text-4xl font-semibold text-brand-600 dark:text-brand-400 tabular-nums tracking-tight-display leading-none">+€4,800</p>
      </div>
      <div className="flex gap-1">
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 rounded">1Y</span>
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted rounded">6M</span>
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted rounded">3M</span>
      </div>
    </div>
    <FlagshipArt />
  </div>
);

/* ═══ Bento card shell ═══ */
function Bento({ className = '', title, desc, children}) {
  return (
    <div className={`p-7 sm:p-8 border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card rounded-[10px] flex flex-col ${className}`}>
      {children && <div className="mb-6">{children}</div>}
      <h3 className="text-2xl font-semibold text-ink-primary dark:text-ink-dark-primary tracking-display leading-tight mb-3">
        {title}
      </h3>
      <p className="text-base text-ink-muted dark:text-ink-dark-muted leading-relaxed">
        {desc}
      </p>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(id);
  }, []);

  const steps = [
    { num: 1, key: 'step1' },
    { num: 2, key: 'step2' },
    { num: 3, key: 'step3' },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-24 sm:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className={`transition-opacity duration-700 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-xs font-medium mb-6 border border-brand-200/60 dark:border-brand-800/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
              </span>
              {t('landing.hero.badge')}
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-[5.5rem] font-semibold text-ink-primary dark:text-ink-dark-primary tracking-tight-display leading-[1.02] mb-7">
              {t('landing.hero.titleLine1')}{' '}
              <span className="text-brand-600 dark:text-brand-400">{t('landing.hero.titleAccent')}</span>
            </h1>

            <p className="text-2xl text-ink-muted dark:text-ink-dark-muted leading-relaxed mb-10 max-w-xl">
              {t('landing.hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-md transition-colors text-base"
              >
                {t('landing.hero.getStarted')}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-4 border border-ink-primary/25 hover:border-ink-primary/60 dark:border-ink-dark-primary/25 dark:hover:border-ink-dark-primary/60 text-ink-primary dark:text-ink-dark-primary font-medium rounded-md transition-colors text-base"
              >
                {t('landing.hero.signIn')}
              </Link>
            </div>

            <p className="text-base text-ink-muted dark:text-ink-dark-muted">
              {t('landing.hero.trustNote')}
            </p>
          </div>

          {/* Dashboard mockup with floating overlays */}
          <div className={`relative transition-opacity duration-700 delay-150 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <DashboardPreview t={t} />
            {/* Emerald accent corner */}
            <div aria-hidden="true" className="hidden lg:block absolute -top-3 -right-3 w-24 h-24 border-t-2 border-r-2 border-brand-500/40 rounded-tr-2xl pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── Product Stats ── */}
      <section className="border-y border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { value: '30',   label: t('landing.stats.freeTransactions') },
              { value: '10+',  label: t('landing.stats.features') },
              { value: '24/7', label: t('landing.stats.cloudSync') },
              { value: '100%', label: t('landing.stats.free') },
            ].map((stat, i) => (
              <div
                key={i}
                className={`px-5 ${i > 0 ? 'border-l border-surface-hairline dark:border-surface-dark-hairline' : ''}`}
              >
                <p className="text-5xl sm:text-6xl font-semibold text-ink-primary dark:text-ink-dark-primary tabular-nums tracking-tight-display">
                  {stat.value}
                </p>
                <p className="eyebrow mt-4 text-base">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Bento Grid ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-3xl">
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-ink-primary dark:text-ink-dark-primary tracking-tight-display leading-[1.05] mb-5">
              {t('landing.features.title')}
            </h2>
            <p className="text-xl text-ink-muted dark:text-ink-dark-muted leading-relaxed">
              {t('landing.cta.subtitle')}
            </p>
          </div>

          {/* Flagship — full-width tracking with embedded chart preview */}
          <div className="mb-5 p-8 sm:p-10 border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card rounded-[10px]">
            <div className="grid lg:grid-cols-[1fr_1fr] gap-10 items-center">
              <div className="order-2 lg:order-1">
                <h3 className="text-4xl sm:text-5xl font-semibold text-ink-primary dark:text-ink-dark-primary tracking-display leading-tight mb-5">
                  {t('landing.features.tracking.title')}
                </h3>
                <p className="text-xl text-ink-muted dark:text-ink-dark-muted leading-relaxed max-w-md">
                  {t('landing.features.tracking.desc')}
                </p>
              </div>
              <div className="order-1 lg:order-2">
                <MV_Tracking t={t} />
              </div>
            </div>
          </div>

          {/* Bento tier — 12-col grid, varied widths */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            <Bento
              className="lg:col-span-4"
              title={t('landing.features.healthscore.title')}
              desc={t('landing.features.healthscore.desc')}
              t={t}
            >
              <MV_Healthscore t={t} />
            </Bento>

            <Bento
              className="lg:col-span-4"
              title={t('landing.features.goals.title')}
              desc={t('landing.features.goals.desc')}
            >
              <MV_Goals t={t} />
            </Bento>

            <Bento
              className="lg:col-span-4"
              title={t('landing.features.networth.title')}
              desc={t('landing.features.networth.desc')}
            >
              <MV_Networth/>
            </Bento>

            <Bento
              className="lg:col-span-6"
              title={t('landing.features.budgets.title')}
              desc={t('landing.features.budgets.desc')}
            >
              <MV_Budgets t={t} />
            </Bento>

            <Bento
              className="lg:col-span-6"
              title={t('landing.features.charts.title')}
              desc={t('landing.features.charts.desc')}
            >
              <MV_Charts t={t} />
            </Bento>

            <Bento
              className="lg:col-span-4"
              title={t('landing.features.cashflow.title')}
              desc={t('landing.features.cashflow.desc')}
            >
              <MV_Cashflow t={t} />
            </Bento>

            <Bento
              className="lg:col-span-4"
              title={t('landing.features.recurring.title')}
              desc={t('landing.features.recurring.desc')}
            >
              <MV_Recurring t={t}/>
            </Bento>

            <Bento
              className="lg:col-span-4"
              title={t('landing.features.multicurrency.title')}
              desc={t('landing.features.multicurrency.desc')}
            >
              <MV_Multicurrency t={t} />
            </Bento>

            <Bento
              className="lg:col-span-6"
              title={t('landing.features.benchmarks.title')}
              desc={t('landing.features.benchmarks.desc')}
            >
              <MV_Benchmarks t={t} />
            </Bento>

            <Bento
              className="lg:col-span-6"
              title={t('landing.features.notifications.title')}
              desc={t('landing.features.notifications.desc')}
            >
              <MV_Notifications t={t} />
            </Bento>

            <Bento
              className="lg:col-span-8"
              title={t('landing.features.categories.title')}
              desc={t('landing.features.categories.desc')}
            >
              <MV_Categories t={t} />
            </Bento>

            <Bento
              className="lg:col-span-4"
              title={t('landing.features.reports.title')}
              desc={t('landing.features.reports.desc')}
            >
              <MV_Reports t={t} />
            </Bento>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative border-y border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card py-20 sm:py-28 overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-3xl flex gap-5">
            <div aria-hidden="true" className="w-1 bg-brand-500 rounded-full flex-shrink-0 my-2" />
            <div>
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-ink-primary dark:text-ink-dark-primary tracking-tight-display leading-[1.05] mb-5">
                {t('landing.howItWorks.title')}
              </h2>
              <p className="text-xl text-ink-muted dark:text-ink-dark-muted">
                {t('landing.howItWorks.subtitle')}
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-10 md:gap-12 relative">
            {/* Connecting dotted line between step circles */}
            <div aria-hidden="true" className="hidden md:block absolute top-6 left-[8%] right-[8%] h-px border-t border-dashed border-brand-500/30 pointer-events-none" />
            {steps.map((step) => (
              <div key={step.key} className="relative">
                <div className="mb-6 relative bg-white dark:bg-surface-dark-card inline-block">
                  <span className="w-12 h-12 rounded-full bg-brand-500 text-white flex items-center justify-center text-base font-semibold tabular-nums tracking-tight shadow-[0_0_0_6px_rgba(34,173,147,0.12)]">
                    {step.num}
                  </span>
                </div>

                <h3 className="text-2xl font-semibold text-ink-primary dark:text-ink-dark-primary tracking-display leading-tight mb-3">
                  {t(`landing.howItWorks.${step.key}.title`)}
                </h3>
                <p className="text-lg text-ink-muted dark:text-ink-dark-muted leading-relaxed">
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
              <div aria-hidden="true" className="w-1 bg-brand-500 rounded-full flex-shrink-0 my-2" />
              <div className="flex-1">
                <h2 className="text-5xl sm:text-6xl font-semibold text-ink-primary dark:text-ink-dark-primary tracking-tight-display leading-[1.05] mb-5">
                  {t('landing.showcase.title')}
                </h2>
                <p className="text-xl text-ink-muted dark:text-ink-dark-muted leading-relaxed mb-8">
                  {t('landing.showcase.desc')}
                </p>
                <ul className="space-y-4">
                  {['showcase1', 'showcase2', 'showcase3'].map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </span>
                      <span className="text-lg text-ink-primary dark:text-ink-dark-primary">{t(`landing.showcase.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="relative">
              {/* Emerald bracket corner accent */}
              <div aria-hidden="true" className="absolute -top-3 -left-3 w-20 h-20 border-t-2 border-l-2 border-brand-500 rounded-tl-xl pointer-events-none" />
              <div aria-hidden="true" className="absolute -bottom-3 -right-3 w-20 h-20 border-b-2 border-r-2 border-brand-500 rounded-br-xl pointer-events-none" />
              <div className="relative rounded-xl overflow-hidden border border-surface-hairline dark:border-surface-dark-hairline shadow-lg">
                <img
                  src={showcaseImg}
                  alt={t('landing.showcase.imageAlt')}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative border-t border-surface-hairline dark:border-surface-dark-hairline bg-gradient-to-br from-white via-brand-50/40 to-white dark:from-surface-dark-card dark:via-brand-950/20 dark:to-surface-dark-card py-24 sm:py-32 overflow-hidden">
        {/* Corner bracket accents */}
        <div aria-hidden="true" className="absolute top-8 left-8 w-16 h-16 border-t border-l border-brand-500/30 rounded-tl-2xl pointer-events-none" />
        <div aria-hidden="true" className="absolute bottom-8 right-8 w-16 h-16 border-b border-r border-brand-500/30 rounded-br-2xl pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs font-semibold uppercase tracking-[0.14em] mb-6 border border-brand-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            {t('landing.hero.badge').split('·')[0].trim()}
          </div>
          <h2 className="text-5xl sm:text-6xl font-semibold text-ink-primary dark:text-ink-dark-primary tracking-tight-display leading-[1.05] mb-5">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-ink-muted dark:text-ink-dark-muted leading-relaxed max-w-lg mx-auto">
            {t('landing.cta.subtitle')}
          </p>
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 mt-10 px-9 py-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-md transition-all text-base shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30"
          >
            {t('landing.cta.button')}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <p className="mt-6 text-sm text-ink-muted dark:text-ink-dark-muted">
            {t('landing.hero.trustNote')}
          </p>
        </div>
      </section>
    </div>
  );
}
