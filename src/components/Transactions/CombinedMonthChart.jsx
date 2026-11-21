import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { AXIS_PROPS, BAR_RADIUS, CHART_GRID, CHART_TOOLTIP_CLASS, useChartAnimation } from '../../utils/chartTheme';

// Bento chart colors (spec 5): income BRAND, expense from the category
// palette, never red (V4: red is for over-budget and errors only).
const INCOME_COLOR = 'var(--brand-text)';
const EXPENSE_COLOR = 'var(--c-data-sand)';
// A month whose spending is above the user's own normal (dashboardModel
// spendingNormal): WARNING, the same "heads up" color budgets use at 70%+.
const ABOVE_NORMAL_COLOR = 'var(--c-warning)';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

// Month name mapping for translation
const MONTH_MAP = {
  'Jan': 'jan', 'Feb': 'feb', 'Mar': 'mar', 'Apr': 'apr',
  'May': 'may', 'Jun': 'jun', 'Jul': 'jul', 'Aug': 'aug',
  'Sep': 'sep', 'Oct': 'oct', 'Nov': 'nov', 'Dec': 'dec',
  'Shk': 'feb', 'Pri': 'apr', 'Gus': 'aug', 'Sht': 'sep', 'Tet': 'oct', 'Nën': 'nov', 'Dhj': 'dec'
};

function CombinedMonthChartLegend({ showAboveNormal }) {
  const { t } = useTranslation();

  const items = [
    { key: 'income', color: INCOME_COLOR, label: t('chart.income') },
    { key: 'expense', color: EXPENSE_COLOR, label: t('chart.expense') },
    ...(showAboveNormal ? [{ key: 'above', color: ABOVE_NORMAL_COLOR, label: t('chart.aboveNormal') }] : []),
  ];

  return (
    <div
      className="flex flex-wrap justify-center gap-x-[18px] gap-y-1 mt-3 text-sm font-semibold text-fg"
    >
      {items.map(item => (
        <div key={item.key} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-swatch"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function translateMonth(monthKey) {
  // monthKey is like "Dec 2025" or "Dhj 2025"
  const parts = monthKey.split(' ');
  const monthAbbr = parts[0];
  const year = parts[1];
  
  // Get the translation key
  const key = MONTH_MAP[monthAbbr] || monthAbbr.toLowerCase().substring(0, 3);
  const translatedMonth = i18n.t(`chart.months.${key}`, { defaultValue: monthAbbr });
  
  return `${translatedMonth} ${year}`;
}

function CombinedMonthTooltip({ active, payload, label }) {
  const { t } = useTranslation();
  const { format: formatCurrency } = useDisplayCurrency();

  if (!active || !payload || payload.length === 0) return null;

  const incomeEntry = payload.find(p => p.name === 'income');
  const expenseEntry = payload.find(p => p.name === 'expense');

  const incomeValue = incomeEntry ? incomeEntry.value : 0;
  const expenseValue = expenseEntry ? expenseEntry.value : 0;
  const aboveNormal = payload[0]?.payload?.aboveNormal;

  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="font-extrabold mb-1">{label}</p>
      <p className="tabular-nums text-brand-text">
        {t('chart.income')}: {formatCurrency(incomeValue)}
      </p>
      <p className="tabular-nums mt-0.5">
        {t('chart.expense')}: {formatCurrency(expenseValue)}
      </p>
      {aboveNormal && <p className="mt-0.5 font-bold text-warning">{t('chart.aboveNormal')}</p>}
    </div>
  );
}

/**
 * normalUpper: the "above your normal" line for one month's spending
 * (dashboardModel.spendingNormal(...).upper, from the full history, not the
 * visible range). Expense bars above it turn WARNING. Omit to disable.
 */
export default function CombinedMonthChart({ transactions, normalUpper = null }) {
  const { t, i18n: i18nInstance } = useTranslation();
  const anim = useChartAnimation();
  const { format: formatCurrency } = useDisplayCurrency();

  // Aggregate transactions by month for both income and expense. Memoized —
  // this ran on every render before (no memo), redoing the full
  // forEach/sort/map on every parent re-render even when `transactions`
  // hadn't actually changed, which got noticeably worse once encryption
  // added extra context re-renders (CryptoContext status changes,
  // TransactionContext's re-fetch-on-unlock effect) upstream.
  const data = useMemo(() => {
    const monthlyData = {};

    transactions.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          income: 0,
          expense: 0,
          date: new Date(date.getFullYear(), date.getMonth(), 1)
        };
      }

      // Use base_amount for multi-currency support, fallback to amount
      const amount = entry.base_amount || entry.amount || 0;

      if (entry.type === 'income') {
        monthlyData[monthKey].income += amount;
      } else if (entry.type === 'expense') {
        monthlyData[monthKey].expense += amount;
      }
    });

    // Convert to array format for Recharts and sort chronologically
    return Object.entries(monthlyData)
      .map(([month, values]) => ({
        month,
        monthDisplay: translateMonth(month),
        income: parseFloat(values.income.toFixed(2)),
        expense: parseFloat(values.expense.toFixed(2)),
        dateObj: values.date
      }))
      .sort((a, b) => a.dateObj - b.dateObj)
      .map(({ monthDisplay, income, expense }) => ({
        month: monthDisplay,
        income,
        expense,
        aboveNormal: normalUpper !== null && expense > normalUpper,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, i18nInstance.language, normalUpper]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-icon bg-inner text-brand-text flex items-center justify-center mb-4">
          <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-base font-extrabold text-fg">{t('chart.noData')}</p>
        <p className="text-sm font-semibold text-fg mt-1">{t('transactions.noTransactions')}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 320 }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="month" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={64} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
          <Tooltip content={<CombinedMonthTooltip />} cursor={false} />
          <Legend
            verticalAlign="bottom"
            align="center"
            height={40}
            content={<CombinedMonthChartLegend showAboveNormal={normalUpper !== null} />}
          />
          <Bar dataKey="income" fill={INCOME_COLOR} name="income" radius={BAR_RADIUS} {...anim} />
          <Bar dataKey="expense" fill={EXPENSE_COLOR} name="expense" radius={BAR_RADIUS} {...anim}>
            {data.map((d) => <Cell key={d.month} fill={d.aboveNormal ? ABOVE_NORMAL_COLOR : EXPENSE_COLOR} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
