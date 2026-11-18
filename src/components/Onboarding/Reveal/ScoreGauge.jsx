import { useCountUp } from '../../../hooks/useCountUp';
import ProgressRing from '../../UI/ProgressRing';

// Onboarding reveal score (spec 4.5): the Bento ProgressRing with a count-up.
// The arc color carries the band (<40 expense, <70 warning, else brand); the
// number stays in --text so it reads in both themes.
export default function ScoreGauge({ score = 0, start = true, size = 200 }) {
  const value = useCountUp(score, { start });
  const clamped = Math.max(0, Math.min(100, value));
  const target = Math.max(0, Math.min(100, score));
  const color = target < 40 ? 'var(--c-expense)' : target < 70 ? 'var(--c-warning)' : 'var(--brand-text)';

  return (
    <ProgressRing
      value={clamped / 100}
      size={size}
      color={color}
      animate={false}
      label={String(Math.round(clamped))}
      labelClassName="text-fg"
      sublabel={<span className="text-sm font-bold text-fg mt-1">/100</span>}
    />
  );
}
