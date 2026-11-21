// Bento chart theme for Recharts (design-system §3, charts). One place for
// tick size, grid, bar radius, tooltip tile and entrance animation so every
// chart reads as one system. Colors are CSS vars, so they follow the theme.
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { D_DATA } from './motion';

export const CHART_TICK = { fontSize: 14, fill: 'var(--text)', fontWeight: 600 };
export const CHART_GRID = { vertical: false, stroke: 'var(--line)' };
export const BAR_RADIUS = [8, 8, 0, 0];
export const CHART_TOOLTIP_CLASS = 'tile !rounded-inner px-3.5 py-2.5 shadow-sheet text-sm font-semibold text-fg tabular-nums';
export const AXIS_PROPS = { tickLine: false, axisLine: false, tick: CHART_TICK };

/** Line marks (month forecast): solid actual line, dashed projection, soft band. */
export const LINE_MARK = { strokeWidth: 3, strokeLinecap: 'round', dot: false };
export const PROJECTION_DASH = '6 6';
export const BAND_OPACITY = 0.16;
export const END_DOT_RADIUS = 6;
/** Room for the first / last x tick labels and a compact y axis. */
export const CHART_MARGIN = { top: 8, right: 24, bottom: 0, left: 0 };
export const Y_AXIS_WIDTH = 64;

/** Recharts animation props: D_DATA ease-out, off under reduced motion (I3). */
export function useChartAnimation() {
  const reduced = usePrefersReducedMotion();
  return { isAnimationActive: !reduced, animationDuration: D_DATA, animationEasing: 'ease-out' };
}
