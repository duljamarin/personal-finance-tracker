import { useEffect, useRef, useState } from 'react';

/**
 * Custom dropdown select that supports rendering arbitrary leading content
 * (icons/SVGs) per option — something native <select>/<option> cannot do.
 *
 * Props:
 *  - value: currently selected value
 *  - onChange: (newValue) => void
 *  - options: Array<{ value: string, label: ReactNode, leading?: ReactNode, disabled?: boolean }>
 *  - placeholder: string (used when value is empty/null)
 *  - placeholderLeading: ReactNode shown next to the placeholder text
 *  - disabled: boolean
 *  - error: boolean (applies error border)
 *  - className: extra classes for the trigger button
 *  - ariaLabel: accessibility label
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = '',
  placeholderLeading = null,
  disabled = false,
  error = false,
  className = '',
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selected = options.find(o => String(o.value) === String(value));

  const baseTrigger =
    'w-full px-3.5 py-3 text-base rounded-md border bg-white dark:bg-surface-dark-card text-ink-primary dark:text-ink-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition flex items-center justify-between gap-2';
  const borderClass = error
    ? 'border-[#e05c6b]'
    : 'border-surface-hairline dark:border-surface-dark-hairline';
  const disabledClass = disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`${baseTrigger} ${borderClass} ${disabledClass} ${className}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {selected ? (
            <>
              {selected.leading}
              <span className="truncate">{selected.label}</span>
            </>
          ) : (
            <>
              {placeholderLeading}
              <span className="truncate text-ink-muted dark:text-ink-dark-muted">{placeholder}</span>
            </>
          )}
        </span>
        <svg
          className={`w-4 h-4 flex-shrink-0 text-ink-muted dark:text-ink-dark-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 min-w-full max-h-64 overflow-y-auto rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card shadow-lg py-1 scrollbar-thin"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-muted dark:text-ink-dark-muted">
              {placeholder}
            </li>
          ) : (
            options.map(opt => {
              const isSelected = String(opt.value) === String(value);
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    opt.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle'
                  } ${
                    isSelected
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-medium'
                      : 'text-ink-primary dark:text-ink-dark-primary'
                  }`}
                >
                  {opt.leading}
                  <span className="truncate flex-1">{opt.label}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
