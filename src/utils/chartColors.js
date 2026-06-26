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

/**
 * Budget/usage progress color by spend ratio. over -> expense, near -> warning,
 * on-track -> income. Single source for budget bars (BudgetCard, BudgetSummaryBar,
 * FreePlanUsageCounter, Benchmark). Returns a CSS-var string.
 */
export function progressColor(ratio) {
  if (ratio >= 1.0) return EXPENSE_COLOR;
  if (ratio >= 0.7) return WARNING_COLOR;
  return INCOME_COLOR;
}

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

/**
 * Deterministic hash-to-color palette for per-category dots/avatars. Shared by
 * Transactions list and CategoryCard so a category always maps to the same hue.
 * Order is preserved from the original CAT_PALETTE so existing categories keep
 * their color. brand.accent and brand-400 slots use their CSS vars.
 */
export const CATEGORY_PALETTE = [
  'var(--c-brand-accent)', // #22ad93
  'var(--c-income)',       // #168b78
  'var(--c-data-sand)',    // #C9A87C
  'var(--c-data-blue)',    // #6A8FC4
  'var(--c-data-rose)',    // #C46A75
  'var(--c-data-gold)',    // #D0A96A
  '#8A8A85',               // warm grey (no semantic token — categorical filler)
  '#43c5aa',               // brand-400 light teal
  'var(--c-data-stone)',   // #7A756A
  'var(--c-data-violet)',  // #9B7EB3
];
