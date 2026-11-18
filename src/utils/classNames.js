/**
 * Combines multiple class names, filtering out falsy values
 * @param {...string|boolean|null|undefined} classes - Class names to combine
 * @returns {string} Combined class names
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Bento tile classes (design-system §3.1).
export const cardClasses = {
  base: "tile p-tile-dense sm:p-tile",
  hover: "tile-lift",
  border: "",
};

// Bento input classes (design-system §4.4): R_INPUT, 2px --line, BRAND focus.
export const inputClasses = {
  base: "min-h-11 border-2 py-2.5 px-3.5 text-base font-bold rounded-input w-full bg-tile text-fg btn-motion",
  focus: "focus:border-brand-600 dark:focus:border-brand-400",
  error: "border-expense",
  normal: "border-line hover:border-inner-2",
};

// Button variant classes
export const buttonClasses = {
  primary: "bg-brand-600 hover:bg-brand-700 text-white",
  secondary: "bg-inner text-fg hover:bg-inner-2",
  danger: "bg-danger hover:bg-danger-hover text-white",
  warning: "bg-warning hover:bg-warning-hover text-white",
  ghost: "bg-inner text-fg hover:bg-inner-2",
};

// Badge/tag classes for transaction types
export const badgeClasses = {
  income: "bg-inner text-brand-text font-bold",
  expense: "bg-inner text-fg font-bold",
  recurring: "bg-inner text-fg font-bold",
  scheduled: "bg-inner text-fg font-bold",
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
    negative = 'text-fg',
    neutral = 'text-ink-primary dark:text-white'
  } = options;
  
  if (value > threshold) return positive;
  if (value < threshold) return negative;
  return neutral;
}
