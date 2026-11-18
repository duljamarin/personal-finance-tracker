import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Prev / label / next pill for month-scoped pages (design-system §3). */
export default function MonthSwitcher({ label, onPrev, onNext, prevLabel, nextLabel, badge }) {
  const btn =
    'btn-motion inline-flex items-center justify-center w-11 h-11 rounded-pill text-fg hover:bg-inner';
  return (
    <div className="inline-flex items-center gap-1 rounded-pill border border-line bg-tile p-0.5">
      <button type="button" onClick={onPrev} className={btn} aria-label={prevLabel}>
        <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden="true" />
      </button>
      <span className="px-1 min-w-[120px] text-center text-sm font-bold text-fg tabular-nums capitalize" aria-live="polite">
        {label}
      </span>
      <button type="button" onClick={onNext} className={btn} aria-label={nextLabel}>
        <ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden="true" />
      </button>
      {badge && <span className="pr-3 pl-1 text-sm font-bold text-brand-text">{badge}</span>}
    </div>
  );
}
