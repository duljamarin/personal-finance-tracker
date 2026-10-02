import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Compact prev / label / next control for month-scoped pages. */
export default function MonthSwitcher({ label, onPrev, onNext, prevLabel, nextLabel, badge }) {
  const btn =
    'inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-primary dark:text-white ' +
    'hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors';
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card p-0.5">
      <button type="button" onClick={onPrev} className={btn} aria-label={prevLabel}>
        <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
      </button>
      <span className="px-2 min-w-[120px] text-center text-sm font-medium text-ink-primary dark:text-white tabular-nums capitalize">
        {label}
      </span>
      <button type="button" onClick={onNext} className={btn} aria-label={nextLabel}>
        <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
      </button>
      {badge && <span className="pr-2 pl-1 text-xs font-medium text-brand-600 dark:text-brand-400">{badge}</span>}
    </div>
  );
}
