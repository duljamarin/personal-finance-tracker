import { progressColor } from '../../utils/chartColors';
import { delayStyle } from '../../utils/motion';

/**
 * Progress bar (design-system §3.4). Track --inner / --inner-2, R_PILL,
 * heights 6 / 10 / 14. Fill color by ratio via the existing budget
 * thresholds (progressColor), unless `color` is given. Entrance grow-x;
 * later value changes transition the width (D_DATA EASE_OUT).
 *
 * ratio: spent / limit (0..∞). Width is clamped to 100%.
 */
const HEIGHT = { 6: 'h-1.5', 10: 'h-2.5', 14: 'h-3.5' };

export default function ProgressBar({
  ratio = 0,
  height = 10,
  track = 'inner-2',
  color,
  delay,
  animate = true,
  label,
  className = '',
}) {
  const safe = Number.isFinite(ratio) ? Math.max(0, ratio) : 0;
  const pct = Math.min(100, safe * 100);
  return (
    <div
      className={`${HEIGHT[height] || HEIGHT[10]} w-full rounded-pill overflow-hidden ${track === 'inner' ? 'bg-inner' : track === 'tile' ? 'bg-tile' : 'bg-inner-2'} ${className}`}
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(safe * 100) : undefined}
    >
      <div
        className={`bar-w h-full rounded-pill origin-left ${animate ? 'animate-grow-x' : ''}`}
        style={{
          width: `${pct}%`,
          backgroundColor: color || progressColor(safe),
          ...(animate && typeof delay === 'number' ? delayStyle(delay) : null),
        }}
      />
    </div>
  );
}
