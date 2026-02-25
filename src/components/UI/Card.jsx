
export default function Card({ children, className = '', variant = 'default', padding = 'md' }) {
  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    gradient: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700',
    outlined: 'bg-transparent border-2 border-gray-200 dark:border-gray-700'
  };
  
  const paddings = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  };
  
  return (
    <div className={`${variants[variant]} ${paddings[padding]} rounded-2xl shadow ${className}`}>
      {children}
    </div>
  );
}
