/**
 * A row of figures inside one bordered panel, divided by hairlines — the
 * statement-header pattern, replacing grids of equal floating stat cards.
 *
 * items: [{ label, value, tone?: 'income'|'expense'|'neutral', note?, hero?, children? }]
 * The first item flagged `hero` gets the larger metric size; the rest recede.
 */
const TONE = {
  income: 'text-brand-600 dark:text-brand-400',
  expense: 'text-expense',
  neutral: 'text-ink-primary dark:text-white',
};

const COLS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
};

export default function StatStrip({ items, className = '' }) {
  const list = items.filter(Boolean);
  return (
    // gap-px over a hairline-colored grid draws the dividers at every breakpoint.
    <section className={`grid grid-cols-1 ${COLS[list.length] || 'sm:grid-cols-2 lg:grid-cols-4'} gap-px bg-surface-hairline dark:bg-surface-dark-hairline border border-surface-hairline dark:border-surface-dark-hairline rounded-container overflow-hidden ${className}`}>
      {list.map((item, i) => (
        <div key={i} className="bg-white dark:bg-surface-dark-card p-4 sm:p-5 min-w-0">
          <p className="eyebrow">{item.label}</p>
          <p
            className={`mt-2 [overflow-wrap:anywhere] font-semibold tabular-nums tracking-tight leading-none ${
              item.hero ? 'text-3xl sm:text-4xl' : 'text-2xl'
            } ${TONE[item.tone || 'neutral']}`}
          >
            {item.value}
          </p>
          {item.children}
          {item.note && <p className="mt-2 text-xs text-ink-muted dark:text-white">{item.note}</p>}
        </div>
      ))}
    </section>
  );
}
