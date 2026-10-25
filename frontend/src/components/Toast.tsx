import React, { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgStyles =
    toast.type === "success"
      ? "bg-emerald-50 border-emerald-300 text-emerald-950"
      : toast.type === "error"
      ? "bg-red-50 border-red-300 text-red-950"
      : "bg-teal-50 border-teal-300 text-teal-950";

  const badgeStyles =
    toast.type === "success"
      ? "text-emerald-700 font-bold"
      : toast.type === "error"
      ? "text-red-700 font-bold"
      : "text-accent font-bold";

  return (
    <div
      role="status"
      className={`pointer-events-auto border rounded-card p-4 shadow-lg flex items-start justify-between space-x-3 transition-all ${bgStyles}`}
    >
      <div>
        <span className={`text-xs uppercase tracking-wider block ${badgeStyles}`}>
          {toast.title}
        </span>
        <p className="text-xs mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-secondary/70 hover:text-primary p-0.5 rounded text-xs focus-visible:ring-1"
        aria-label="Dismiss alert"
      >
        ✕
      </button>
    </div>
  );
};
