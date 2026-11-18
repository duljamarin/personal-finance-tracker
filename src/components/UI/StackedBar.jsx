import { delayStyle, STAGGER } from '../../utils/motion';

/**
 * Horizontal stacked bar (design-system §3.4): 18px, R_PILL, 3px gaps,
 * segment color = category color, segments grow-x with delay(i), legend
 * under it (10px swatch R 3px, name, amount weight 800).
 *
 * segments: [{ key, label, value, color, display }]  display = formatted amount
 */
export default function StackedBar({ segments, ariaLabel, delay = 0, legend = true, className = '' }) {
  const list = (segments || []).filter((s) => s.value > 0);
  const total = list.reduce((sum, s) => sum + s.value, 0);
  if (!total) return null;
  return (
    <div className={className}>
      <div role="img" aria-label={ariaLabel} className="flex gap-[3px] h-[18px] rounded-pill overflow-hidden">
        {list.map((s, i) => (
          <div
            key={s.key}
            className="bar-w h-full origin-left animate-grow-x"
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color, ...delayStyle(delay + i * STAGGER) }}
          />
        ))}
      </div>
      {legend && (
        <ul className="flex flex-wrap gap-x-[18px] gap-y-1.5 mt-3">
          {list.map((s) => (
            <li key={s.key} className="flex items-center gap-[7px] text-sm font-semibold text-fg min-w-0">
              <span className="w-2.5 h-2.5 rounded-swatch shrink-0" style={{ backgroundColor: s.color }} aria-hidden="true" />
              <span className="truncate">{s.label}</span>
              <span className="font-extrabold tabular-nums">{s.display}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
