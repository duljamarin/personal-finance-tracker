import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 0.18;

/**
 * Scroll reveal that fires once per mount (I1). Returns [ref, revealed].
 * Attach `ref` to the section; render its entrance classes only when
 * `revealed` is true. The observer unobserves after the first hit. Without
 * IntersectionObserver (old browsers, jsdom) content is revealed at once.
 *
 * Callers render `revealClass(revealed, 'animate-pop')` (utils/motion): while
 * pending the element carries `.reveal-pending`, which hides it only when the
 * user allows motion, so reduced-motion users and no-IO environments always
 * see the content.
 */
export function useRevealOnce({ threshold = THRESHOLD } = {}) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(
    () => typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function',
  );

  useEffect(() => {
    if (revealed) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const observer = new window.IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(entry.target);
          observer.disconnect();
          break;
        }
      }
    }, { threshold });
    observer.observe(node);
    return () => observer.disconnect();
  }, [revealed, threshold]);

  return [ref, revealed];
}

export default useRevealOnce;
