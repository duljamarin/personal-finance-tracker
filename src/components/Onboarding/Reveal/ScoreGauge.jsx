import { useCountUp } from '../../../hooks/useCountUp';

// Hand-drawn SVG arc gauge (no chart lib). Fills a 270° arc proportional to
// score/100 and counts the number up. Color shifts by band.
export default function ScoreGauge({ score = 0, start = true, size = 200 }) {
  const value = useCountUp(score, { duration: 1400, start });
  const clamped = Math.max(0, Math.min(100, value));

  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // 270° arc starting from bottom-left (135°) going clockwise to bottom-right.
  const startAngle = 135;
  const sweep = 270;
  const circumference = 2 * Math.PI * r;
  const arcLength = (sweep / 360) * circumference;
  const dashOffset = arcLength * (1 - clamped / 100);

  // Band color: <40 expense red, <70 amber, else brand green.
  const color =
    clamped < 40 ? '#e8394d' : clamped < 70 ? '#e0a417' : '#168b78';

  const polar = (angleDeg) => {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const startPt = polar(startAngle);
  const endPt = polar(startAngle + sweep);
  const largeArc = sweep > 180 ? 1 : 0;
  const arcPath = `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <path
          d={arcPath}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-surface-hairline dark:stroke-surface-dark-hairline"
        />
        {/* Value arc */}
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke 300ms' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-bold tabular-nums tracking-tight leading-none"
          style={{ fontSize: size * 0.28, color }}
        >
          {Math.round(clamped)}
        </span>
        <span className="text-xs text-ink-muted dark:text-white/60 mt-1">/100</span>
      </div>
    </div>
  );
}
