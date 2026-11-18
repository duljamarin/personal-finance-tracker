import { useEffect, useRef, useState } from 'react';
import { D_COUNT, easeOutCubic, prefersReducedMotion } from '../utils/motion';

/**
 * Number count-up (I4). requestAnimationFrame + cubic ease-out.
 *
 * - First run tweens from `from` (default 0) to `value` after `delay` ms.
 * - Any later change of `value` (month switch, new transaction) tweens from
 *   the value currently on screen, never from 0.
 * - prefers-reduced-motion: the final value is rendered on the first frame.
 * - `start: false` holds the final value without animating (legacy callers
 *   that trigger the tween when a section becomes visible).
 */
export function useCountUp(value, { duration = D_COUNT, delay = 0, from = 0, start = true } = {}) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(() => (prefersReducedMotion() || !start ? target : from));
  const displayRef = useRef(display);
  const rafRef = useRef(null);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (!start || prefersReducedMotion()) {
      displayRef.current = target;
      setDisplay(target);
      return undefined;
    }
    const origin = displayRef.current;
    if (origin === target) return undefined;

    let startAt = null;
    const tick = (now) => {
      if (startAt === null) startAt = now + delay;
      const t = Math.min(1, Math.max(0, (now - startAt) / duration));
      const next = t >= 1 ? target : origin + (target - origin) * easeOutCubic(t);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // delay only matters for the run it starts with; not a dependency on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, start, duration]);

  return display;
}

export default useCountUp;
