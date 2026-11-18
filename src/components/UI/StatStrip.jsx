import { delayStyle, tileDelay } from '../../utils/motion';

/**
 * Summary figures (design-system §3): one tile holding --inner summary
 * boxes, like the Activity "Money in / Money out" boxes.
 *
 * items: [{ label, value, tone?: 'income'|'expense'|'neutral'|'over', note?, hero?, children? }]
 * Tone (V4): income = --brand-text, expense = --text (ink), over = EXPENSE.
 * index: tile entrance position.
 */
const TONE = {
  income: 'text-brand-text',
  expense: 'text-fg',
  neutral: 'text-fg',
  over: 'text-expense',
};

const COLS = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
};

export default function StatStrip({ items, className = '', index }) {
  const list = items.filter(Boolean);
  const animated = typeof index === 'number';
  return (
    <section
      className={`tile tile-lift p-3 grid grid-cols-1 ${COLS[list.length] || 'sm:grid-cols-2 lg:grid-cols-4'} gap-3 ${animated ? 'animate-pop' : ''} ${className}`}
      style={animated ? delayStyle(tileDelay(index)) : undefined}
    >
      {list.map((item, i) => (
        <div key={i} className="tile-inner px-[18px] py-[14px] min-w-0">
          <p className="text-sm font-bold text-fg">{item.label}</p>
          <p className={`mt-1 [overflow-wrap:anywhere] text-h1 font-extrabold tabular-nums ${TONE[item.tone || 'neutral']}`}>
            {item.value}
          </p>
          {item.children}
          {item.note && <p className="mt-1 text-sm font-semibold text-fg">{item.note}</p>}
        </div>
      ))}
    </section>
  );
}
