// Flag icon for a currency.
//
// The SVGs live in public/currency-flags/<CODE>.svg (from the flag-icons
// package, MIT v7.5.0) and are served as plain images rather than inlined as
// JSX: inlining eight flags meant ~8KB of generated path data sitting in a
// component, which is a lot of noise for what is just a picture.
//
// Same approach as the Albanian flag in ToolsNav.
//
// Emoji flags are deliberately not used anywhere: Windows ships no
// regional-indicator glyphs, so they degrade to bare letters ("AL").

const SUPPORTED = new Set(['EUR', 'USD', 'GBP', 'ALL', 'CHF', 'JPY', 'CAD', 'AUD']);

/**
 * Renders the flag for a currency code, or nothing for an unknown code so a
 * legacy/new currency degrades to its text label instead of a broken image.
 *
 * Decorative by default: the currency code is always rendered next to it, so
 * the image is hidden from screen readers rather than repeating that text.
 */
export default function CurrencyFlag({ code, className = '' }) {
  if (!SUPPORTED.has(code)) return null;

  return (
    <img
      src={`/currency-flags/${code}.svg`}
      alt=""
      aria-hidden="true"
      width="16"
      height="12"
      decoding="async"
      className={`shrink-0 rounded-[2px] ring-1 ring-black/15 ${className}`}
    />
  );
}
