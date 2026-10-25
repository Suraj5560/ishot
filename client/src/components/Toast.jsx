import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning' || toast.type === 'duplicate';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-fadeIn ${
              isSuccess
                ? 'bg-emerald-50/95 dark:bg-emerald-950/95 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800'
                : isError
                ? 'bg-rose-50/95 dark:bg-rose-950/95 text-rose-900 dark:text-rose-100 border-rose-200 dark:border-rose-800'
                : 'bg-amber-50/95 dark:bg-amber-950/95 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800'
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start space-x-2.5 mr-2">
              {isSuccess && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              )}
              {isError && (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              {isWarning && (
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-semibold">{toast.title}</p>
                {toast.message && (
                  <p className="text-[11px] opacity-90 mt-0.5">{toast.message}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
