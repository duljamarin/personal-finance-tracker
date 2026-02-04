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
  base: "bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 sm:p-6",
  hover: "hover:shadow-2xl transition-all duration-300",
  border: "border border-gray-200 dark:border-gray-700",
  gradient: "dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-850",
};

// Common input styling classes
export const inputClasses = {
  base: "border py-2 px-2 sm:p-3 text-xs sm:text-base rounded-xl sm:w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition",
  focus: "focus:ring-blue-500 dark:focus:ring-blue-600",
  error: "border-red-500 focus:ring-red-500",
  normal: "border-gray-300 dark:border-gray-600",
};

// Button variant classes
export const buttonClasses = {
  primary: "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white",
  secondary: "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white",
  danger: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white",
  warning: "bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900",
  ghost: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600",
};

// Badge/tag classes for transaction types
export const badgeClasses = {
  income: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 dark:border dark:border-green-600",
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
    positive = 'text-green-600 dark:text-green-400',
    negative = 'text-red-600 dark:text-red-400',
    neutral = 'text-blue-600 dark:text-blue-400'
  } = options;
  
  if (value > threshold) return positive;
  if (value < threshold) return negative;
  return neutral;
}
