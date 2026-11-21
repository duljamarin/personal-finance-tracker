import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PrimaryCta from './PrimaryCta';

/**
 * Sticky "Start free" bar for phones and tablets (below 1024px).
 *
 * Shown once the hero's primary CTA has scrolled out above the viewport;
 * hidden again from the moment the final CTA section comes into view (and
 * stays hidden below it, so it never sits over the footer links). While it
 * is visible, a spacer of the same height ends the page so nothing is ever
 * stuck underneath it.
 *
 * Enters with translateY(100%) -> 0 (D_ENTER, EASE_SPRING); the global
 * reduced-motion rule turns the transition off.
 */
export default function StickyCta({ heroCtaRef, finalRef }) {
  const { t } = useTranslation();
  const [heroPassed, setHeroPassed] = useState(false);
  const [finalReached, setFinalReached] = useState(false);

  useEffect(() => {
    if (typeof window.IntersectionObserver !== 'function') return undefined;
    const observers = [];
    const watch = (node, onChange) => {
      if (!node) return;
      const io = new window.IntersectionObserver(([entry]) => onChange(entry));
      io.observe(node);
      observers.push(io);
    };
    watch(heroCtaRef?.current, (e) => setHeroPassed(!e.isIntersecting && e.boundingClientRect.top < 0));
    watch(finalRef?.current, (e) => setFinalReached(e.isIntersecting || e.boundingClientRect.top < 0));
    return () => observers.forEach((io) => io.disconnect());
  }, [heroCtaRef, finalRef]);

  const visible = heroPassed && !finalReached;
  const barHeight = 'calc(76px + env(safe-area-inset-bottom))';

  return (
    <>
      {visible && <div className="lg:hidden" style={{ height: barHeight }} aria-hidden="true" />}
      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 z-40 bg-tile border-t border-line [transition:transform_var(--d-enter)_var(--ease-spring),visibility_var(--d-enter)] ${visible ? 'translate-y-0 visible' : 'translate-y-full invisible'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-hidden={!visible}
        inert={!visible}
        data-sticky-cta
      >
        <div className="max-w-content mx-auto h-[76px] px-4 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-fg min-w-0">{t('landing.sticky.value')}</p>
          <PrimaryCta location="sticky" size="md" className="shrink-0" />
        </div>
      </div>
    </>
  );
}
