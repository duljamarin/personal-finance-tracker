import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PrimaryCta from './PrimaryCta';

/**
 * Sticky "Start free" bar for phones and tablets (below 1024px).
 *
 * Shown once the hero's primary CTA has scrolled out above the viewport;
 * hidden again from the moment the final CTA section comes into view (and
 * stays hidden below it, so it never sits over the footer links). It also
 * steps aside while another "Start free" is on screen, so a screen never
 * shows two primary buttons (R1). While it is visible, a spacer of the same
 * height ends the page so nothing is ever stuck underneath it.
 *
 * Enters with translateY(100%) -> 0 (D_ENTER, EASE_SPRING); the global
 * reduced-motion rule turns the transition off.
 */
export default function StickyCta({ heroCtaRef, finalRef }) {
  const { t } = useTranslation();
  const [heroPassed, setHeroPassed] = useState(false);
  const [finalReached, setFinalReached] = useState(false);
  const [inlineCtas, setInlineCtas] = useState(0);

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

    // Other in-page primary CTAs (features, tools, pricing). The tools one
    // mounts late (lazy), so pick CTAs up as they appear.
    const seen = new Set();
    const inView = new Set();
    const ctaIo = new window.IntersectionObserver((entries) => {
      for (const e of entries) (e.isIntersecting ? inView.add(e.target) : inView.delete(e.target));
      setInlineCtas(inView.size);
    });
    observers.push(ctaIo);
    const scan = () => {
      document.querySelectorAll('[data-cta]:not([data-cta="hero"]):not([data-cta="sticky"]):not([data-cta="final"])').forEach((el) => {
        if (!seen.has(el)) { seen.add(el); ctaIo.observe(el); }
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(heroCtaRef?.current?.closest('[data-landing]') || document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); observers.forEach((io) => io.disconnect()); };
  }, [heroCtaRef, finalRef]);

  const visible = heroPassed && !finalReached && inlineCtas === 0;
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
