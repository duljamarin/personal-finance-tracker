export default function Input({
  label,
  error,
  helperText,
  className = '',
  required,
  leadingIcon,
  ...props
}) {
  const inputBase =
    'w-full py-3 text-base bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white ' +
    'placeholder:text-ink-muted/40 dark:placeholder:text-white/40 ' +
    'border transition-colors duration-150 rounded-md focus:outline-none ' +
    'focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500';
  const borderState = error
    ? 'border-[#e8394d] focus:border-[#e8394d] focus:ring-[#e8394d]/20'
    : 'border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-white/20';
  const padding = leadingIcon ? 'pl-11 pr-3.5' : 'px-3.5';

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-ink-primary dark:text-white mb-2">
          {label}
          {required && <span className="text-brand-600 dark:text-brand-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted dark:text-white/50 flex items-center pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          className={`${inputBase} ${borderState} ${padding} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-2 text-xs text-[#e8394d] flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-xs text-ink-muted dark:text-white">{helperText}</p>
      )}
    </div>
  );
}
