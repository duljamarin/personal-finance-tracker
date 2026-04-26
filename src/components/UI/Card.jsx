export default function Card({ children, className = '', variant = 'default', padding = 'md' }) {
  const variants = {
    default:
      'bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline',
    elevated:
      'bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline shadow-md',
    interactive:
      'bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline ' +
      'hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40 transition-colors duration-200 cursor-pointer',
    outlined:
      'bg-transparent border border-surface-hairline dark:border-surface-dark-hairline',
    ghost:
      'bg-surface-page/70 dark:bg-surface-dark-page/70 border border-transparent',
  };

  const paddings = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  };

  return (
    <div className={`${variants[variant]} ${paddings[padding]} rounded-[10px] ${className}`}>
      {children}
    </div>
  );
}
