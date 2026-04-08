
export default function Card({ children, className = '', variant = 'default', padding = 'md' }) {
  const variants = {
    default: 'bg-white dark:bg-surface-dark-tertiary border border-gray-200 dark:border-zinc-800/80',
    elevated: 'bg-white dark:bg-surface-dark-tertiary border border-gray-200 dark:border-zinc-800/80 shadow-md',
    interactive: 'bg-white dark:bg-surface-dark-tertiary border border-gray-200 dark:border-zinc-800/80 hover:border-brand-300 dark:hover:border-brand-800/60 hover:shadow-md transition-all duration-200 cursor-pointer',
    outlined: 'bg-transparent border border-gray-200 dark:border-zinc-800/80',
    ghost: 'bg-gray-50/50 dark:bg-surface-dark-secondary border border-transparent',
  };

  const paddings = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6'
  };

  return (
    <div className={`${variants[variant]} ${paddings[padding]} rounded-xl ${className}`}>
      {children}
    </div>
  );
}
