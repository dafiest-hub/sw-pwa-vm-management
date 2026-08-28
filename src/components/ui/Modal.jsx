import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/**
 * Modal común. Los cuatro modales que había escritos a mano no cerraban con
 * Escape ni con clic fuera, y no bloqueaban el scroll de fondo.
 */
export const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
}) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foco al primer control para que el teclado no se quede en el fondo.
    const focusable = panelRef.current?.querySelector(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus?.();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal-panel ${SIZES[size] || SIZES.md} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line-subtle pb-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="p-2.5 rounded-2xl bg-accent/10 border border-accent/20 flex-shrink-0">
                <Icon className="w-5 h-5 text-accent-soft" />
              </div>
            )}
            <div className="min-w-0">
              <h4 className="text-base font-bold text-content truncate">{title}</h4>
              {subtitle && <p className="text-xs text-content-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-surface-hover flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}

        {footer && <div className="flex gap-2 pt-4 mt-4 border-t border-line-subtle">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
