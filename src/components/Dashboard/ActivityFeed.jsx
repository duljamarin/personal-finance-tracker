import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Repeat } from 'lucide-react';
import Card from '../UI/Card';
import SegmentedControl from '../UI/SegmentedControl';
import StackedBar from '../UI/StackedBar';
import ProgressBar from '../UI/ProgressBar';
import CategoryAvatar, { colorFromName } from '../UI/CategoryAvatar';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { useCountUp } from '../../hooks/useCountUp';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { formatMonthName, formatShortDay, toISODate } from '../../utils/date';
import { MINUS, signed } from '../../utils/bento';
import { baseAmountOf } from '../../utils/finance/shared';
import { dataDelay, delayStyle, rowDelay } from '../../utils/motion';
import { activityRows, categoryStack, groupByDay, monthKeyOf, monthTotals } from '../../utils/finance/dashboardModel';

/** Today / Yesterday / localized short date ("Sun, 15 Nov" / "Die, 15 nën"). */
export function useDayLabel() {
  const { t, i18n } = useTranslation();
  const today = toISODate(new Date());
  const yesterday = toISODate(new Date(Date.now() - 86400000));
  const thisYear = String(new Date().getFullYear());
  return (day) => {
    if (!day) return '';
    if (day === today) return t('transactions.today');
    if (day === yesterday) return t('transactions.yesterday');
    const d = new Date(`${day}T00:00:00`);
    if (Number.isNaN(d.getTime())) return day;
    return formatShortDay(d, i18n.language, { withYear: !day.startsWith(thisYear) });
  };
}

/** Day group header: label left, the day's net total right. */
export function DayHeader({ label, net, delay }) {
  const { format } = useDisplayCurrency();
  return (
    <div className="animate-rise flex justify-between gap-3 px-3 pt-2.5 pb-1 text-sm font-extrabold" style={delayStyle(delay)}>
      <span className="text-fg">{label}</span>
      <span className={`tabular-nums ${net > 0 ? 'text-brand-text' : 'text-fg'}`}>
        {net > 0 ? '+' : net < 0 ? MINUS : ''}{format(Math.abs(net))}
      </span>
    </div>
  );
}

/**
 * Activity row (spec 3.8), shared by the dashboard feed and /transactions.
 * 48px tinted icon square, title 800, signed amount 19px/800 (income
 * --brand-text with "+", expense --text with "−"), meta line with an optional
 * 6px budget bar. Income rows sit on --inner. `actions` renders trailing
 * controls (edit/delete on /transactions), revealed on hover and always
 * visible on touch.
 */
export function ActivityRow({ tx, category, meta, budgetRatio, delay, fresh, onOpen, actions, openLabel }) {
  const { format } = useDisplayCurrency();
  const income = tx.type === 'income';
  return (
    <li
      className={`activity-row group relative flex items-center rounded-icon ${income ? 'bg-inner' : ''} ${fresh ? 'animate-row-new' : 'animate-rise'}`}
      style={fresh ? undefined : delayStyle(delay)}
    >
      <button
        type="button"
        onClick={onOpen}
        title={openLabel}
        className="flex-1 min-w-0 flex items-center gap-[14px] p-3 text-left rounded-icon"
      >
        <span className="activity-icon shrink-0">
          <CategoryAvatar category={category} fallbackName={tx.title} size="lg" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex items-center gap-2">
              <span className="font-extrabold text-fg truncate">{tx.title}</span>
              {tx.source_recurring_id && <Repeat className="w-4 h-4 shrink-0 text-fg" strokeWidth={2} aria-hidden="true" />}
            </span>
            <span className={`text-h3 font-extrabold tabular-nums whitespace-nowrap ${income ? 'text-brand-text' : 'text-fg'}`}>
              {signed(format(baseAmountOf(tx)), income)}
            </span>
          </span>
          {(meta || typeof budgetRatio === 'number') && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm font-semibold text-fg">
              {meta && <span className="min-w-0 truncate">{meta}</span>}
              {typeof budgetRatio === 'number' && (
                <span className="flex-[1_1_80px] max-w-[140px]">
                  <ProgressBar ratio={budgetRatio} height={6} animate={false} />
                </span>
              )}
            </span>
          )}
        </span>
      </button>
      {actions && (
        <div className="flex items-center gap-0.5 pr-2 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 btn-motion [@media(hover:none)]:opacity-100">
          {actions}
        </div>
      )}
    </li>
  );
}

function SummaryBox({ label, value, income, delay }) {
  const { format } = useDisplayCurrency();
  const shown = useCountUp(value, { delay });
  return (
    <div className="tile-inner px-[18px] py-[14px] min-w-0">
      <p className="text-sm font-bold text-fg">{label}</p>
      <p className={`text-h1 font-extrabold tabular-nums [overflow-wrap:anywhere] ${income ? 'text-brand-text' : 'text-fg'}`}>
        {income ? '+' : MINUS}{format(shown)}
      </p>
    </div>
  );
}

const openEdit = (tx) => window.dispatchEvent(new CustomEvent('openEditTransaction', { detail: tx }));

/**
 * Activity feed (spec 3.8). Month totals, the month's spending split, and the
 * last 7 days (max 8 rows) grouped by day. New rows (added while mounted)
 * slide in with row-new; switching the filter or month re-plays the rows.
 */
export default function ActivityFeed({
  transactions,
  categories,
  monthRef,
  budgets = [],
  expenses = {},
  loading,
  index = 4,
  className = '',
}) {
  const { t, i18n } = useTranslation();
  const { format } = useDisplayCurrency();
  const dayLabel = useDayLabel();
  const [filter, setFilter] = useState('all');
  const month = formatMonthName(monthRef, i18n.language);
  const monthKey = monthKeyOf(monthRef);
  const base = dataDelay(index);

  const totals = useMemo(() => monthTotals(transactions, monthRef), [transactions, monthRef]);
  const rows = useMemo(() => activityRows(transactions, monthRef, { filter }), [transactions, monthRef, filter]);
  const groups = groupByDay(rows);

  // Budget usage per category for the meta line.
  const budgetByCat = useMemo(() => {
    const map = new Map();
    for (const b of budgets) {
      const limit = Number(b.amount) || 0;
      if (limit > 0) map.set(String(b.category_id), (Number(expenses[b.category_id]) || 0) / limit);
    }
    return map;
  }, [budgets, expenses]);

  const catById = useMemo(() => new Map((categories || []).map((c) => [String(c.id), c])), [categories]);
  const stack = useMemo(() => categoryStack(expenses, categories), [expenses, categories]);
  const segments = [
    ...stack.head.map((h) => ({
      key: h.id,
      label: translateCategoryName(h.category?.name || ''),
      value: h.value,
      color: colorFromName(h.category?.name || h.id),
      display: format(h.value, { decimals: 0 }),
    })),
    ...(stack.other > 0 ? [{ key: 'other', label: t('dashboard.otherCategories'), value: stack.other, color: 'var(--inner-2)', display: format(stack.other, { decimals: 0 }) }] : []),
  ];

  // row-new: ids that appear after the first loaded render.
  const seenRef = useRef(null);
  const [fresh, setFresh] = useState(() => new Set());
  useEffect(() => {
    if (loading) return;
    const ids = (transactions || []).map((tx) => tx.id);
    if (seenRef.current === null) {
      seenRef.current = new Set(ids);
      return;
    }
    const added = ids.filter((id) => !seenRef.current.has(id));
    ids.forEach((id) => seenRef.current.add(id));
    if (added.length) setFresh(new Set(added));
  }, [transactions, loading]);

  // First mount waits for the tile; later filter/month switches start at 0.
  const playedRef = useRef(false);
  const listBase = playedRef.current ? 0 : base;
  useEffect(() => { if (!loading) playedRef.current = true; }, [loading, filter, monthKey]);

  let n = 0;
  return (
    <Card index={index} padding="sm" className={`flex flex-col gap-[18px] ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 font-bold text-fg">{t('dashboard.activity')}</h2>
        <SegmentedControl
          className="w-full sm:w-auto"
          ariaLabel={t('dashboard.filterActivity')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('dashboard.filter.all') },
            { value: 'expense', label: t('dashboard.filter.spending') },
            { value: 'income', label: t('dashboard.filter.income') },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryBox label={t('dashboard.moneyIn', { month })} value={totals.income} income delay={base} />
        <SummaryBox label={t('dashboard.moneyOut', { month })} value={totals.expense} delay={base} />
      </div>

      {segments.length > 0 && (
        <StackedBar segments={segments} ariaLabel={t('dashboard.spendingSplit')} delay={base + 50} />
      )}

      <div key={`${filter}|${monthKey}`} className="flex flex-col gap-1">
        {groups.length === 0 && !loading && (
          <p className="px-3 py-2 text-base font-semibold text-fg">{t('dashboard.activityEmpty')}</p>
        )}
        {groups.map((g) => {
          const headerDelay = rowDelay(n++, listBase);
          return (
            <section key={g.day}>
              <DayHeader label={dayLabel(g.day)} net={g.net} delay={headerDelay} />
              <ul className="flex flex-col gap-1">
                {g.items.map((tx) => {
                  const cat = tx.category || catById.get(String(tx.category_id)) || null;
                  const catName = cat ? translateCategoryName(cat.name) : (tx.has_splits ? t('dashboard.splitTransaction') : '');
                  const ratio = tx.type === 'expense' && cat ? budgetByCat.get(String(cat.id)) : undefined;
                  const meta = typeof ratio === 'number'
                    ? t('dashboard.ofBudget', { category: catName, pct: Math.round(ratio * 100) })
                    : catName;
                  return (
                    <ActivityRow
                      key={tx.id}
                      tx={tx}
                      category={cat}
                      meta={meta}
                      budgetRatio={ratio}
                      delay={rowDelay(n++, listBase)}
                      fresh={fresh.has(tx.id)}
                      onOpen={() => openEdit(tx)}
                      openLabel={t('transactions.edit')}
                    />
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <Link to="/transactions" className="group mt-auto inline-flex items-center gap-1.5 self-start min-h-11 px-3 text-sm font-bold text-brand-text">
        {t('dashboard.viewAllCount', { count: totals.count })}
        <ArrowRight className="arrow-nudge w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
      </Link>
    </Card>
  );
}
