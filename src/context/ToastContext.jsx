import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle, Check, Info, X } from 'lucide-react';
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
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after the toast lifetime (D_COUNT * 2 + 800ms, see config/app.js)
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
      <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none w-[calc(100vw-32px)] sm:w-auto">
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

// Toast (design-system §3.7): bottom-center pill, --text background with
// --tile text (inverts in dark), check icon in color-mix(BRAND 45%, WHITE).
const ICONS = { success: Check, error: AlertCircle, info: Info, warning: AlertTriangle };
const ICON_COLOR = {
  success: 'var(--toast-check)',
  info: 'var(--toast-check)',
  error: 'var(--c-expense)',
  warning: 'var(--c-warning)',
};

function Toast({ message, type, onClose }) {
  const { t } = useTranslation();
  const Icon = ICONS[type] || Check;
  return (
    <div
      role="status"
      className="pointer-events-auto animate-toast-in flex items-center gap-2.5 max-w-full sm:max-w-md pl-5 pr-1.5 py-1.5 rounded-pill font-bold text-sm"
      style={{ backgroundColor: 'var(--toast-bg)', color: 'var(--toast-fg)' }}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={3} style={{ color: ICON_COLOR[type] || ICON_COLOR.success }} aria-hidden="true" />
      <p className="flex-1 min-w-0 py-1.5">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('forms.close')}
        className="shrink-0 w-11 h-11 flex items-center justify-center rounded-pill opacity-80 hover:opacity-100"
      >
        <X className="w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
