/**
 * Neutral segmented control: white "thumb" on a subtle track. Used for
 * view filters (all / active / completed, time ranges). Solid brand fills stay
 * reserved for primary actions.
 *
 * options: [{ value, label }]
 */
export default function SegmentedControl({ options, value, onChange, size = 'md', ariaLabel }) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex p-0.5 rounded-md bg-surface-subtle dark:bg-surface-dark-subtle">
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`${pad} font-medium rounded-[5px] transition-colors ${
              active
                ? 'bg-white dark:bg-surface-dark-elevated text-ink-primary dark:text-white shadow-xs'
                : 'text-ink-muted dark:text-white hover:text-ink-primary'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
