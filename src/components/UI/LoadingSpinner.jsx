export default function LoadingSpinner({ size = 'md', text, className = '' }) {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-9 h-9 border-[2.5px]',
    lg: 'w-14 h-14 border-[3px]',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizes[size]} border-surface-hairline dark:border-surface-dark-hairline border-t-brand-600 dark:border-t-brand-500 rounded-full animate-spin`}
      />
      {text && (
        <p className="mt-3 text-sm text-ink-muted dark:text-white">
          {text}
        </p>
      )}
    </div>
  );
}
