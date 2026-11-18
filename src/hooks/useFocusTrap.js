import { useEffect } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Trap Tab focus inside `ref` while mounted (P5 / §3.6). Focuses
 * `initialFocusRef`, else the first form field, else the first focusable, on open and returns focus to the
 * element that had it before (the trigger) on close.
 */
export function useFocusTrap(ref, { active = true, initialFocusRef } = {}) {
  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const previous = document.activeElement;

    const focusables = () => Array.from(node.querySelectorAll(FOCUSABLE))
      .filter((el) => el.offsetParent !== null || el === document.activeElement);

    // Prefer the first form field (the quick-add amount) over the close button.
    const firstField = Array.from(node.querySelectorAll('input:not([type="hidden"]):not([disabled]), textarea, select'))
      .find((el) => el.offsetParent !== null);
    const first = initialFocusRef?.current || firstField || focusables()[0];
    if (first && typeof first.focus === 'function' && !node.contains(document.activeElement)) {
      first.focus({ preventScroll: true });
    }

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) { e.preventDefault(); return; }
      const head = list[0];
      const tail = list[list.length - 1];
      if (e.shiftKey && document.activeElement === head) { e.preventDefault(); tail.focus(); }
      else if (!e.shiftKey && document.activeElement === tail) { e.preventDefault(); head.focus(); }
    };
    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [ref, active, initialFocusRef]);
}

export default useFocusTrap;
