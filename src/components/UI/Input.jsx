export default function Input({ 
  label, 
  error, 
  helperText,
  className = '', 
  required,
  ...props 
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <input 
        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-surface-dark-elevated dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors duration-150 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 ${
          error 
            ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' 
            : 'border-gray-200 dark:border-zinc-700'
        } ${className}`} 
        {...props} 
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
}
