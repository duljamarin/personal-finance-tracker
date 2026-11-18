export default function LoadingSpinner({ size = 'md', text, className = '' }) {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-9 h-9 border-[2.5px]',
    lg: 'w-14 h-14 border-[3px]',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizes[size]} border-inner-2 border-t-brand-600 dark:border-t-brand-400 rounded-full animate-spin`}
      />
      {text && (
        <p className="mt-3 text-sm font-semibold text-fg">
          {text}
        </p>
      )}
    </div>
  );
}
