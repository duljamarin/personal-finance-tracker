// Bento color formulas that need a runtime input (design-system §1.2).

/** --tint(c) = color-mix(in srgb, c 14%, var(--tile)) — category icon background. */
export const tintOf = (color) => `color-mix(in srgb, ${color} 14%, var(--tile))`;

/**
 * Progress fill by spend ratio (§3.4). Uses the existing budget thresholds
 * from utils/chartColors.progressColor so budgets, bars and alerts agree.
 */
export { progressColor as progressFill } from './chartColors';

/**
 * SVG path for a sparkline in a W x H viewBox (balance / net-worth hero
 * tiles). Values are scaled to the box with `pad` units of headroom.
 */
export function linePath(values, W = 600, H = 120, pad = 8) {
  if (!values || values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = pad + (1 - (v - min) / span) * (H - pad * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

/** U+2212 minus sign for signed amounts. */
export const MINUS = '−';

/** Prefix a formatted amount with + / − (U+2212). */
export const signed = (formatted, isIncome) => `${isIncome ? '+' : MINUS}${formatted}`;
