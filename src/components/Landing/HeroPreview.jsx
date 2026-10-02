import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, ArrowLeftRight, PieChart, Repeat, Target, TrendingUp,
} from 'lucide-react';
import { CategoryIconSvg } from '../UI/CategoryIconSvg';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { formatMonthName } from '../../utils/date';

/**
 * Static rendition of the real dashboard for the landing hero, with sample
 * data. Deliberately plain HTML/CSS + lucide: no Recharts, no image request,
 * nothing that can delay LCP or enter the landing bundle as weight. It mirrors
 * Dashboard/SummaryCards + the recent-activity list + BudgetSummaryBar so the
 * first thing a visitor sees is the product they will actually use.
 *
 * Decorative (aria-hidden): the hero copy carries the meaning; a screen reader
 * gets one label instead of a tour of fake numbers.
 */

// Six months of income/expense, in thousands, oldest first.
const BARS = [
  [3.2, 1.9], [3.4, 1.5], [3.2, 2.1], [3.6, 1.7], [3.4, 1.65], [3.8, 1.4],
];
const BAR_MAX = 4;

const TX = [
  { key: 'market', cat: 'Food & Dining', amount: '−€64.20', color: '#BE8A45' },
  { key: 'fuel', cat: 'Transportation', amount: '−€48.00', color: '#3E6DB5' },
  { key: 'salary', cat: 'Salary', amount: '+€3,800.00', color: '#0B5D3B', income: true },
  { key: 'rent', cat: 'Housing & Rent', amount: '−€650.00', color: '#7D5BA6' },
];

const BUDGETS = [
  { cat: 'Food & Dining', pct: 68 },
  { cat: 'Transportation', pct: 92 },
  { cat: 'Entertainment', pct: 41 },
];

function Stat({ label, value, tone = '', children }) {
  return (
    <div className="bg-white dark:bg-surface-dark-card px-3.5 py-3 min-w-0">
      <p className="text-[10px] font-medium text-ink-muted dark:text-white truncate">{label}</p>
      <p className={`mt-1 text-[15px] font-semibold tabular-nums tracking-tight leading-none ${tone || 'text-ink-primary dark:text-white'}`}>{value}</p>
      {children}
    </div>
  );
}

export default function HeroPreview() {
  const { t, i18n } = useTranslation();
  const now = new Date();
  const month = formatMonthName(now, i18n.language);
  const nav = [
    { Icon: LayoutDashboard, label: t('nav.dashboard'), active: true },
    { Icon: ArrowLeftRight, label: t('nav.transactions') },
    { Icon: PieChart, label: t('budgets.title') },
    { Icon: Repeat, label: t('nav.recurring') },
    { Icon: Target, label: t('goals.title') },
    { Icon: TrendingUp, label: t('networth.title') },
  ];

  return (
    <div
      role="img"
      aria-label={t('landing.preview.label')}
      className="rounded-[10px] border border-surface-hairline dark:border-surface-dark-hairline bg-surface-page dark:bg-surface-dark-page overflow-hidden select-none"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}
    >
      <div aria-hidden="true">
        {/* URL bar only: no traffic-light dots (ui-quality-principles #5). */}
        <div className="h-8 flex items-center px-4 border-b border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card">
          <span className="text-[11px] text-ink-muted dark:text-white">personal-finances.app/dashboard</span>
        </div>

        <div className="flex">
          {/* Sidebar: dropped only in the 1024-1279 band, where the preview
              shares the row with the hero copy and is too narrow to carry it. */}
          <div className="hidden md:block lg:hidden xl:block w-40 shrink-0 border-r border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card p-2.5">
            <div className="flex items-center gap-2 px-1.5 pb-3">
              <span className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 17 L10 11 L14 14 L20 6" /><path d="M15 6 L20 6 L20 11" />
                </svg>
              </span>
              <span className="text-[11px] font-semibold text-ink-primary dark:text-white truncate">{t('app.shortName')}</span>
            </div>
            <div className="space-y-0.5">
              {nav.map(({ Icon, label, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium ${active ? 'bg-brand-600 text-white' : 'text-ink-muted dark:text-white'}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0 p-3 sm:p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-surface-hairline dark:bg-surface-dark-hairline border border-surface-hairline dark:border-surface-dark-hairline rounded-md overflow-hidden">
              <Stat label={t('dashboard.balanceAllTime')} value="€12,480.35" />
              <Stat label={t('dashboard.incomeMonth', { month })} value="€3,800.00" tone="text-brand-600 dark:text-brand-400" />
              <Stat label={t('dashboard.spendingMonth', { month })} value="€1,402.60" />
              <Stat label={t('dashboard.savingsRate')} value="63%">
                <div className="mt-1.5 h-1 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline overflow-hidden">
                  <div className="h-full w-[63%] rounded-full bg-brand-500" />
                </div>
              </Stat>
            </div>

            <div className="grid sm:grid-cols-[1.35fr_1fr] gap-3">
              {/* Cash flow + recent */}
              <div className="space-y-3 min-w-0">
                <div className="rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card p-3">
                  <p className="text-[11px] font-semibold text-ink-primary dark:text-white mb-2">{t('chart.cashFlow')}</p>
                  <div className="flex items-end gap-2 h-20">
                    {BARS.map(([inc, exp], i) => (
                      <div key={i} className="flex-1 flex items-end justify-center gap-[3px] h-full">
                        <div className="w-full max-w-[12px] rounded-t-[2px] bg-income" style={{ height: `${(inc / BAR_MAX) * 100}%` }} />
                        <div className="w-full max-w-[12px] rounded-t-[2px] bg-expense" style={{ height: `${(exp / BAR_MAX) * 100}%` }} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card overflow-hidden">
                  <p className="px-3 py-2 text-[11px] font-semibold text-ink-primary dark:text-white">{t('transactions.recent')}</p>
                  <p className="px-3 py-1 text-[10px] font-medium text-ink-muted dark:text-white bg-surface-page dark:bg-surface-dark-page border-y border-surface-hairline dark:border-surface-dark-hairline">
                    {t('transactions.today')}
                  </p>
                  <div className="divide-y divide-surface-hairline dark:divide-surface-dark-hairline">
                    {TX.map(tx => (
                      <div key={tx.key} className="flex items-center gap-2.5 px-3 py-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-surface-subtle dark:bg-surface-dark-subtle" style={{ color: tx.color }}>
                          <CategoryIconSvg iconKey={tx.cat} className="w-3 h-3" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[11px] font-medium text-ink-primary dark:text-white truncate">{t(`landing.preview.tx.${tx.key}`)}</span>
                          <span className="block text-[10px] text-ink-muted dark:text-white truncate">{translateCategoryName(tx.cat)}</span>
                        </span>
                        <span className={`text-[11px] font-semibold tabular-nums ${tx.income ? 'text-brand-600 dark:text-brand-400' : 'text-ink-primary dark:text-white'}`}>
                          {tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budgets */}
              <div className="hidden sm:block rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card p-3 self-start">
                <p className="text-[11px] font-semibold text-ink-primary dark:text-white mb-3">{t('dashboard.budgetProgress')}</p>
                <div className="space-y-3">
                  {BUDGETS.map(b => (
                    <div key={b.cat}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="font-medium text-ink-primary dark:text-white truncate">{translateCategoryName(b.cat)}</span>
                        <span className="tabular-nums font-semibold text-ink-primary dark:text-white">{b.pct}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${b.pct}%`, backgroundColor: b.pct >= 70 ? 'var(--c-warning)' : 'var(--c-income)' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
