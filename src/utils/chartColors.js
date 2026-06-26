/**
 * Single source of truth for chart + semantic colors used outside Tailwind
 * classes (Recharts fills, inline styles, SVG strokes).
 *
 * Values are kept in sync with the CSS custom properties in src/index.css and
 * the tokens in tailwind.config.cjs. Prefer referencing the CSS var directly
 * (e.g. style={{ color: 'var(--c-expense)' }}) in components; use these JS
 * constants only where a literal string is required (Recharts `fill`, palette
 * arrays). See .claude/design-system.md §2.
 */

// CSS var references — resolve to the live token, theme-aware where the var is
// redefined under .dark. Safe in any context that renders into the DOM.
export const INCOME_COLOR = 'var(--c-income)';
export const EXPENSE_COLOR = 'var(--c-expense)';
export const WARNING_COLOR = 'var(--c-warning)';

// Hex fallbacks for the rare case a raw hex is unavoidable (e.g. computing a
// derived rgba). These mirror :root in index.css.
export const HEX = {
  income: '#168b78',
  incomeDark: '#22AD93',
  expense: '#e8394d',
  warning: '#C98A2B',
  brandLight: '#43c5aa',
};

/**
 * Categorical palette for pies / multi-series charts. Reads the data.* tokens
 * via CSS vars so it stays in sync with the design system. Order is the curated
 * "varied, harmonious, premium" ladder from the original CHART_PALETTE.
 */
export const CHART_PALETTE = [
  'var(--c-income)',       // brand teal (primary)
  'var(--c-data-blue)',    // muted indigo-blue
  'var(--c-data-sand)',    // warm amber-sand
  'var(--c-data-violet)',  // muted purple
  'var(--c-data-rose)',    // muted rose
  'var(--c-data-sage)',    // sage green (was #43c5aa light teal slot — keep variety)
  'var(--c-data-gold)',    // golden amber
  'var(--c-data-stone)',   // warm stone grey
  'var(--c-data-blue-deep)', // steel blue
];
