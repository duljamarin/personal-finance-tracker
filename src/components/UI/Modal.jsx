import { useEffect } from 'react';

export default function Modal({ children, onClose, className = '', drawer = false }) {
  const isMobileDrawer = drawer;

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 sm:px-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`
          bg-white dark:bg-surface-dark-card shadow-xl relative w-full border border-surface-hairline dark:border-surface-dark-hairline
          ${isMobileDrawer
            ? 'md:rounded-xl md:max-w-lg rounded-t-xl sm:rounded-xl mb-0 sm:mb-0 md:relative max-h-[85vh] md:max-h-[90vh] overflow-y-auto scrollbar-thin animate-slide-up md:animate-scale-in'
            : 'rounded-xl max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin animate-scale-in'
          }
          ${className}
        `}
      >
        {isMobileDrawer && (
          <div className="md:hidden sticky top-0 bg-white dark:bg-surface-dark-card pt-3 pb-2 flex justify-center rounded-t-xl z-10">
            <div className="w-10 h-1 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full" />
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink-primary dark:text-white dark:hover:text-ink-dark-primary focus:outline-none z-10 w-8 h-8 flex items-center justify-center hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 rounded-md transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className={isMobileDrawer ? 'p-4 sm:p-6 md:p-8' : 'p-6 sm:p-8'}>
          {children}
        </div>
      </div>
    </div>
  );
}
