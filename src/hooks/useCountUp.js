import { useEffect, useRef, useState } from 'react';

// Animate a number from 0 (or `from`) to `to` over `duration` ms using
// requestAnimationFrame with an ease-out curve. Returns the current value.
// Restarts whenever `to` changes. Respects prefers-reduced-motion (jumps
// straight to the target).
export function useCountUp(to, { duration = 1200, from = 0, start = true } = {}) {
  const [value, setValue] = useState(start ? from : to);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!start) {
      setValue(to);
      return;
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValue(to);
      return;
    }

    const target = Number(to) || 0;
    startTimeRef.current = null;

    const tick = (now) => {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [to, duration, from, start]);

  return value;
}
