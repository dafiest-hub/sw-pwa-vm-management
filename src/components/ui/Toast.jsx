import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

/** Sustituye a los `alert()` nativos que había repartidos por las páginas. */
const ToastContext = createContext(null);

const STYLES = {
  success: { cls: 'bg-status-ok/15 border-status-ok/40 text-emerald-200', Icon: CheckCircle2 },
  error: { cls: 'bg-status-danger/15 border-status-danger/40 text-rose-200', Icon: AlertTriangle },
  info: { cls: 'bg-surface-raised border-line text-content-secondary', Icon: Info },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (message, type = 'info', ms = 5000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((t) => [...t, { id, message, type }]);
      if (ms) setTimeout(() => dismiss(id), ms);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      push,
      success: (m, ms) => push(m, 'success', ms),
      error: (m, ms) => push(m, 'error', ms ?? 8000),
      info: (m, ms) => push(m, 'info', ms),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-[60] space-y-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const { cls, Icon } = STYLES[t.type] || STYLES.info;
          return (
            <div
              key={t.id}
              className={`flex items-start gap-2 p-3 rounded-2xl border shadow-xl backdrop-blur-sm animate-fade-in ${cls}`}
            >
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-semibold flex-1 break-words">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar aviso"
                className="opacity-60 hover:opacity-100 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
