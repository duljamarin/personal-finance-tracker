/**
 * Selectable chip (design-system §3.2): R_PILL, 2px --line border,
 * selected = BRAND fill + white text. Real <button> with aria-pressed.
 */
export default function Chip({ selected = false, children, className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`btn-motion chip-lift inline-flex items-center gap-2 min-h-11 px-4 rounded-pill border-2 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed ${
        selected
          ? 'bg-brand-600 border-brand-600 text-white'
          : 'bg-tile border-line text-fg hover:border-inner-2'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
