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
  border: "border border-surface-hairline dark:border-surface-dark-hairline",
};

// Common input styling classes
export const inputClasses = {
  base: "border py-2 px-2 sm:p-3 text-xs sm:text-base rounded-lg sm:w-full bg-white dark:bg-surface-dark-elevated text-ink-primary dark:text-white focus:outline-none focus:ring-1 transition",
  focus: "focus:ring-brand-500/20 focus:border-brand-500",
  error: "border-expense focus:ring-expense",
  normal: "border-surface-hairline dark:border-surface-dark-hairline",
};

// Button variant classes
export const buttonClasses = {
  primary: "bg-brand-600 hover:bg-brand-700 text-white",
  secondary: "bg-surface-secondary dark:bg-surface-dark-elevated text-ink-primary dark:text-white hover:bg-surface-hairline dark:hover:bg-surface-dark-tertiary",
  danger: "bg-danger hover:bg-danger-hover text-white",
  warning: "bg-warning hover:bg-warning-hover text-white",
  ghost: "bg-surface-secondary dark:bg-surface-dark-elevated text-ink-primary dark:text-white hover:bg-surface-hairline dark:hover:bg-surface-dark-tertiary",
};

// Badge/tag classes for transaction types
export const badgeClasses = {
  income: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400 dark:border dark:border-brand-600",
  expense: "bg-expense-bg text-expense dark:bg-expense-tint dark:text-expense dark:border dark:border-expense/40",
  recurring: "bg-data-violet/10 text-data-violet dark:bg-data-violet/20 dark:text-data-violet dark:border dark:border-data-violet/40",
  scheduled: "bg-data-blue/10 text-data-blue dark:bg-data-blue/20 dark:text-data-blue dark:border dark:border-data-blue/40",
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
    negative = 'text-expense dark:text-expense',
    neutral = 'text-ink-primary dark:text-white'
  } = options;
  
  if (value > threshold) return positive;
  if (value < threshold) return negative;
  return neutral;
}
