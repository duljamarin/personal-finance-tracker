/**
 * Combines multiple class names, filtering out falsy values
 * @param {...string|boolean|null|undefined} classes - Class names to combine
 * @returns {string} Combined class names
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Common card styling classes
export const cardClasses = {
  base: "bg-white dark:bg-surface-dark-tertiary rounded-xl p-5 sm:p-6",
  hover: "hover:shadow-md transition-all duration-300",
  border: "border border-gray-200 dark:border-zinc-800",
};

// Common input styling classes
export const inputClasses = {
  base: "border py-2 px-2 sm:p-3 text-xs sm:text-base rounded-lg sm:w-full bg-white dark:bg-surface-dark-elevated text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 transition",
  focus: "focus:ring-brand-500/20 focus:border-brand-500",
  error: "border-red-500 focus:ring-red-500",
  normal: "border-gray-300 dark:border-zinc-700",
};

// Button variant classes
export const buttonClasses = {
  primary: "bg-brand-600 hover:bg-brand-700 text-white",
  secondary: "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  warning: "bg-amber-500 hover:bg-amber-600 text-white",
  ghost: "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700",
};

// Badge/tag classes for transaction types
export const badgeClasses = {
  income: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400 dark:border dark:border-brand-600",
  expense: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 dark:border dark:border-red-600",
  recurring: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 dark:border dark:border-purple-600",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 dark:border dark:border-blue-600",
};

/**
 * Gets input class names based on error state
 * @param {boolean} hasError - Whether the field has an error
 * @returns {string} Combined class names
 */
export function getInputClassName(hasError) {
  return cn(
    inputClasses.base,
    inputClasses.focus,
    hasError ? inputClasses.error : inputClasses.normal
  );
}

/**
 * Gets conditional text color based on value
 * @param {number} value - The numeric value
 * @param {number} threshold - The threshold value
 * @param {object} options - Color options
 * @returns {string} Color class
 */
export function getValueColorClass(value, threshold = 0, options = {}) {
  const {
    positive = 'text-brand-600 dark:text-brand-400',
    negative = 'text-red-600 dark:text-red-400',
    neutral = 'text-blue-600 dark:text-blue-400'
  } = options;
  
  if (value > threshold) return positive;
  if (value < threshold) return negative;
  return neutral;
}
