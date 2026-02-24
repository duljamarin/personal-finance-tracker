import { useEffect } from 'react';

export default function Modal({ children, onClose, className = '', drawer = false }) {
  const isMobileDrawer = drawer;

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 sm:px-0 bg-black bg-opacity-40 transition-all duration-200"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`
        bg-white dark:bg-gray-800 shadow-2xl relative w-full
        ${isMobileDrawer 
          ? 'md:rounded-3xl md:max-w-lg md:animate-fade-in rounded-3xl mb-4 sm:mb-0 md:relative max-h-[85vh] md:max-h-none overflow-y-auto animate-slide-up' 
          : 'rounded-3xl max-w-lg animate-fade-in'
        }
        ${className}
      `}>
        {/* Mobile drawer handle */}
        {isMobileDrawer && (
          <div className="md:hidden sticky top-0 bg-white dark:bg-gray-800 pt-3 pb-2 flex justify-center rounded-t-3xl z-10">
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
        )}
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl font-bold focus:outline-none z-10 w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
          aria-label="Close"
        >
          &times;
        </button>
        
        <div className={isMobileDrawer ? 'p-4 sm:p-6 md:p-8' : 'p-8'}>
          {children}
        </div>
      </div>
      
      <style>{`
        .animate-fade-in { 
          animation: fadeIn 0.2s ease; 
        } 
        @keyframes fadeIn { 
          from { 
            opacity: 0; 
            transform: scale(0.96); 
          } 
          to { 
            opacity: 1; 
            transform: scale(1); 
          } 
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @media (min-width: 768px) {
          .animate-slide-up {
            animation: fadeIn 0.2s ease;
          }
        }
      `}</style>
    </div>
  );
}
