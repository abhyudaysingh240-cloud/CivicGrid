import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let idRef = React.useRef(0);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* aria-live region for screen readers */}
      <div aria-live="polite" aria-atomic="false" className="sr-only" id="toast-announcer">
        {toasts.map(t => <span key={t.id}>{t.type}: {t.message}</span>)}
      </div>
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            role="alert"
            className={`toast pointer-events-auto ${
              t.type === 'success' ? 'toast-success' : t.type === 'error' ? 'toast-error' : 'toast-info'
            }`}
            style={{ animation: 'slideUp 200ms ease-out' }}
          >
            {t.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
            {t.type === 'error'   && <XCircle className="w-4 h-4 shrink-0" />}
            {t.type === 'info'    && <Info className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
