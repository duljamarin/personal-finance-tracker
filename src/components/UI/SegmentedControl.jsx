/**
 * Segmented filter with a sliding pill (design-system §3.3).
 * Track --inner, 4px padding, R_PILL; equal-width options; the pill slides
 * under the active option via translateX(index * 100%), D_ENTER EASE_SPRING.
 * The active state lives on the real <button> (aria-pressed).
 *
 * options: [{ value, label }]
 * track: 'inner' (inside a tile, default) | 'tile' (placed directly on the
 *        --page background, where an --inner track would be invisible)
 */
export default function SegmentedControl({ options, value, onChange, size = 'md', ariaLabel, className = '', track = 'inner' }) {
  const count = options.length || 1;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const text = size === 'sm' ? 'px-3 text-sm' : 'px-4 text-sm';
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`relative inline-grid p-1 rounded-pill ${track === 'tile' ? 'bg-tile border border-line' : 'bg-inner'} ${className}`}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="slide-pill absolute top-1 bottom-1 left-1 rounded-pill shadow-pill"
        style={{
          width: `calc((100% - 8px) / ${count})`,
          transform: `translateX(${index * 100}%)`,
          backgroundColor: track === 'tile' ? 'var(--inner-2)' : 'var(--seg-pill)',
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`relative z-[1] min-h-11 ${text} font-bold whitespace-nowrap rounded-pill text-fg`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
