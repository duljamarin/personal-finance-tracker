import { delayStyle } from '../../utils/motion';

/**
 * Progress ring (design-system §3.4). SVG rotated -90deg, round caps, track
 * --inner-2 (pass track="tile" when the ring sits on an --inner panel), draw
 * entrance. The center label is ONE text node in a flex-centered layer so
 * "72%" never splits; font-size = size * 0.23.
 *
 * value: 0..1 (clamped). label: string shown in the center (default "N%").
 */
const R = 50;
const C = 2 * Math.PI * R; // 314.16 in the 120-unit viewBox

export default function ProgressRing({
  value = 0,
  size = 104,
  stroke,
  track = 'inner-2',
  color = 'var(--brand-text)',
  label,
  sublabel,
  delay,
  animate = true,
  ariaLabel,
  className = '',
  labelClassName = '',
}) {
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const width = stroke ?? (size >= 120 ? 14 : 12);
  const text = label ?? `${Math.round(v * 100)}%`;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg
        role={ariaLabel ? 'img' : undefined}
        aria-label={ariaLabel}
        aria-hidden={ariaLabel ? undefined : true}
        width={size}
        height={size}
        viewBox="0 0 120 120"
        className="block -rotate-90"
      >
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth={width} style={{ stroke: `var(--${track})` }} />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={C}
          className={`ring-arc ${animate ? 'animate-draw' : ''}`}
          style={{
            stroke: color,
            strokeDashoffset: C * (1 - v),
            '--len': C,
            ...(animate && typeof delay === 'number' ? delayStyle(delay) : null),
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-extrabold leading-none tracking-[-0.02em] whitespace-nowrap tabular-nums ${labelClassName}`}
          style={{ fontSize: Math.round(size * 0.23) }}
        >
          {text}
        </span>
        {sublabel}
      </div>
    </div>
  );
}
