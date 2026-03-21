
export default function Card({ children, className = '', variant = 'default', padding = 'md' }) {
  const variants = {
    default: 'bg-white dark:bg-surface-dark-tertiary border border-gray-200/80 dark:border-zinc-800',
    elevated: 'bg-white dark:bg-surface-dark-tertiary border border-gray-200/80 dark:border-zinc-800 shadow-md',
    interactive: 'bg-white dark:bg-surface-dark-tertiary border border-gray-200/80 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-200',
    outlined: 'bg-transparent border border-gray-200 dark:border-zinc-800'
  };
  
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6'
  };
  
  return (
    <div className={`${variants[variant]} ${paddings[padding]} rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}
