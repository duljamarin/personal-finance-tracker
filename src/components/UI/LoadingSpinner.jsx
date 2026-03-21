export default function LoadingSpinner({ size = 'md', text, className = '' }) {
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-[3px]',
    lg: 'w-14 h-14 border-[3px]'
  };
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizes[size]} border-gray-200 dark:border-zinc-700 border-t-brand-600 rounded-full animate-spin`}></div>
      {text && (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{text}</p>
      )}
    </div>
  );
}
