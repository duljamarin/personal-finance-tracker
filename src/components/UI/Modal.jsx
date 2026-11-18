import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

/**
 * Floating panel (design-system §3). Focus is trapped while open, Esc closes,
 * focus returns to the trigger.
 *
 * variant / drawer:
 *   centered (default)  tile panel in the middle, R_SHELL
 *   drawer              bottom sheet below md, centered from md up
 *   sheet               quick-add sheet: bottom-right from 640px
 *                       (width min(400px, 100vw - 48px)), bottom sheet below
 */
export default function Modal({ children, onClose, className = '', drawer = false, variant, ariaLabel, initialFocusRef }) {
  const { t } = useTranslation();
  const panelRef = useRef(null);
  const kind = variant || (drawer ? 'drawer' : 'centered');
  useFocusTrap(panelRef, { initialFocusRef });

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const overlay = {
    centered: 'items-end sm:items-center justify-center px-4 sm:px-0',
    drawer: 'items-end md:items-center justify-center md:px-0',
    sheet: 'items-end justify-center sm:justify-end sm:p-6',
  }[kind];

  const panel = {
    centered: 'rounded-shell max-w-lg max-h-[90vh] mb-4 sm:mb-0',
    drawer: 'rounded-t-shell md:rounded-shell md:max-w-lg max-h-[85vh] md:max-h-[90vh]',
    sheet: 'rounded-t-shell sm:rounded-shell sm:w-[min(400px,calc(100vw-48px))] max-h-[90vh]',
  }[kind];

  const pad = kind === 'sheet' ? 'p-tile-dense' : kind === 'drawer' ? 'p-tile-dense md:p-tile' : 'p-tile-dense sm:p-tile';

  return (
    // !mt-0: modals are often rendered inside a `space-y-*` page, whose sibling
    // margin would otherwise push this fixed overlay down and leave an undimmed
    // strip across the top of the viewport.
    <div
      className={`fixed inset-0 z-50 !mt-0 flex ${overlay} ${kind === 'sheet' ? 'bg-black/20' : 'bg-black/50'} animate-fade-in`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`bg-tile border border-line text-fg shadow-sheet relative w-full overflow-y-auto scrollbar-thin animate-sheet-in ${panel} ${className}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="btn-motion absolute top-3 right-3 z-10 w-11 h-11 flex items-center justify-center rounded-pill text-fg hover:bg-inner"
          aria-label={t('forms.close')}
        >
          <X className="w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden="true" />
        </button>

        <div className={pad}>
          {children}
        </div>
      </div>
    </div>
  );
}
