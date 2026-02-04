/**
 * Reusable loading spinner component
 */
export default function LoadingSpinner({ size = 'md', text, className = '' }) {
  const sizes = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-4',
    lg: 'w-16 h-16 border-4'
  };
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizes[size]} border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin`}></div>
      {text && (
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{text}</p>
      )}
    </div>
  );
}
