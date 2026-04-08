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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 sm:px-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`
        bg-white dark:bg-surface-dark-tertiary shadow-xl relative w-full border border-gray-200/50 dark:border-zinc-700/50
        ${isMobileDrawer
          ? 'md:rounded-2xl md:max-w-lg rounded-t-2xl sm:rounded-2xl mb-0 sm:mb-0 md:relative max-h-[85vh] md:max-h-[90vh] overflow-y-auto animate-slide-up md:animate-scale-in'
          : 'rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in'
        }
        ${className}
      `}>
        {isMobileDrawer && (
          <div className="md:hidden sticky top-0 bg-white dark:bg-surface-dark-tertiary pt-3 pb-2 flex justify-center rounded-t-2xl z-10">
            <div className="w-10 h-1 bg-gray-300 dark:bg-zinc-600 rounded-full"></div>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none z-10 w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
