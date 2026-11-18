// Bento motion tokens for JS (design-system §1.5).
// The durations mirror the --d-* custom properties in src/index.css; a unit
// test (utils/__tests__/motion.test.js) fails if the two drift apart.

export const D_FAST = 180;
export const D_ENTER = 380;
export const D_TILE = 600;
export const D_DATA = 700;
export const D_COUNT = 900;
export const STAGGER = 80;
export const STAGGER_ROW = 45;
export const MAX_STAGGERED = 8;

/** toast lifetime = D_COUNT * 2 + 800ms */
export const TOAST_LIFETIME = D_COUNT * 2 + 800;

const clampIndex = (i) => Math.min(Math.max(0, i | 0), MAX_STAGGERED);

/** tile delay(i) = min(i, MAX_STAGGERED) * STAGGER */
export const tileDelay = (i = 0) => clampIndex(i) * STAGGER;

/** row delay(i) = min(i, MAX_STAGGERED) * STAGGER_ROW + list base delay */
export const rowDelay = (i = 0, base = 0) => clampIndex(i) * STAGGER_ROW + base;

/** data delay = tile delay + D_TILE * 0.5 (bars/rings start when the tile is half in) */
export const dataDelay = (tileIndex = 0) => tileDelay(tileIndex) + D_TILE * 0.5;

/** Inline style that feeds the --delay custom property used by animate-* classes. */
export const delayStyle = (ms) => ({ '--delay': `${Math.round(ms)}ms` });

/** Class for a scroll-revealed element: hidden until revealed, then animates once. */
export const revealClass = (revealed, animation = 'animate-pop') =>
  (revealed ? animation : 'reveal-pending');

/** Cubic ease-out, shared by count-ups. */
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
