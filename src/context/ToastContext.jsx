import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { APP_CONFIG } from '../config/app';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timerRefs = useRef({});

  // Clear all pending timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(timerRefs.current).forEach(clearTimeout);
    };
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after configured duration
    timerRefs.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
      delete timerRefs.current[id];
    }, APP_CONFIG.TOAST_DURATION);
  }, []);

  const removeToast = useCallback((id) => {
    // Cancel the auto-remove timer if the user dismisses manually
    if (timerRefs.current[id]) {
      clearTimeout(timerRefs.current[id]);
      delete timerRefs.current[id];
    }
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function Toast({ message, type, onClose }) {
  const borderColors = {
    success: 'border-l-emerald-500',
    error: 'border-l-red-500',
    info: 'border-l-brand-500',
    warning: 'border-l-amber-500'
  };

  const iconColors = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    info: 'text-brand-500',
    warning: 'text-amber-500'
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  };

  return (
    <div 
      className={`bg-white dark:bg-surface-dark-elevated border border-gray-200 dark:border-zinc-700 border-l-4 ${borderColors[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px] max-w-md pointer-events-auto animate-slide-in-right`}
      onClick={onClose}
    >
      <div className={`flex-shrink-0 ${iconColors[type]}`}>
        {icons[type]}
      </div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded p-1 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
