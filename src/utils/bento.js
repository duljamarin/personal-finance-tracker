// Bento color formulas that need a runtime input (design-system §1.2).

/** --tint(c) = color-mix(in srgb, c 14%, var(--tile)) — category icon background. */
export const tintOf = (color) => `color-mix(in srgb, ${color} 14%, var(--tile))`;

/**
 * Progress fill by spend ratio (§3.4). Uses the existing budget thresholds
 * from utils/chartColors.progressColor so budgets, bars and alerts agree.
 */
export { progressColor as progressFill } from './chartColors';

/** U+2212 minus sign for signed amounts. */
export const MINUS = '−';

/** Prefix a formatted amount with + / − (U+2212). */
export const signed = (formatted, isIncome) => `${isIncome ? '+' : MINUS}${formatted}`;
