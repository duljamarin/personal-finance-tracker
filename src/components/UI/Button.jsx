export default function Button({ children, className = '', variant = 'primary', size = 'md', ...props }) {
  const variants = {
    primary:
      'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white border border-transparent',
    secondary:
      'bg-transparent border border-ink-primary/25 hover:border-ink-primary/60 text-ink-primary ' +
      'dark:border-ink-dark-primary/25 dark:hover:border-ink-dark-primary/60 dark:text-white',
    success:
      'bg-brand-700 hover:bg-brand-600 text-white border border-transparent',
    danger:
      'bg-transparent border border-danger/50 hover:border-danger hover:bg-danger/5 text-danger',
    ghost:
      'bg-transparent hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-ink-dark-primary border border-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-sm',
  };

  return (
    <button
      className={`rounded-md font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
