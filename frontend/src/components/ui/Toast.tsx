import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import { useMockStore } from '../../mock/mockStore';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useMockStore();

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-teal shrink-0" />,
    error: <ShieldAlert className="w-5 h-5 text-coral shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber shrink-0" />,
    info: <Info className="w-5 h-5 text-teal shrink-0" />,
  };

  return (
    <div
      aria-live="polite"
      className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 w-full max-w-sm pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-input bg-white border border-line shadow-lift"
          >
            {iconMap[toast.variant]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading font-bold text-ink">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-muted hover:text-ink p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
