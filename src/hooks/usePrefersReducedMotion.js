import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../utils/motion';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Live `prefers-reduced-motion: reduce` flag (I3). */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    onChange();
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else if (mql.addListener) mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else if (mql.removeListener) mql.removeListener(onChange);
    };
  }, []);

  return reduced;
}

export default usePrefersReducedMotion;
