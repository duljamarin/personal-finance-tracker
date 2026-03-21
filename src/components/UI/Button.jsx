export default function Button({ children, className = '', variant = 'primary', size = 'md', ...props }) {
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm',
    secondary: 'bg-white dark:bg-surface-dark-elevated border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 text-gray-700 dark:text-gray-200 shadow-xs',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300'
  };

  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  };

  return (
    <button 
      className={`rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
}
