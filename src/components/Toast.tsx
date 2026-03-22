import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";

type ToastVariant = "error" | "warning" | "success";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  error: (message: string) => void;
  warning: (message: string) => void;
  success: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; text: string; icon: string }> = {
  error: {
    bg: "bg-red-950/90",
    border: "border-red-500/30",
    text: "text-red-300",
    icon: "text-red-400",
  },
  warning: {
    bg: "bg-amber-950/90",
    border: "border-amber-500/30",
    text: "text-amber-300",
    icon: "text-amber-400",
  },
  success: {
    bg: "bg-emerald-950/90",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    icon: "text-emerald-400",
  },
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  error: "\u2716",
  warning: "\u26A0",
  success: "\u2714",
};

function ToastMessage({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Trigger enter animation on next frame
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(item.id), 300);
    }, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, onDismiss]);

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => onDismiss(item.id), 300);
  };

  const s = VARIANT_STYLES[item.variant];

  return (
    <div
      style={{
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s ease, opacity 0.3s ease",
      }}
      className={`${s.bg} ${s.border} border backdrop-blur-md rounded-lg shadow-2xl px-4 py-3 flex items-start gap-3 max-w-sm pointer-events-auto`}
    >
      <span className={`${s.icon} text-base mt-0.5 shrink-0`}>{VARIANT_ICONS[item.variant]}</span>
      <p className={`${s.text} text-sm font-medium flex-1 leading-snug`}>{item.message}</p>
      <button
        onClick={handleClose}
        className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const contextValue: ToastContextValue = {
    error: useCallback((msg: string) => addToast(msg, "error"), [addToast]),
    warning: useCallback((msg: string) => addToast(msg, "warning"), [addToast]),
    success: useCallback((msg: string) => addToast(msg, "success"), [addToast]),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast container — fixed top-right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastMessage key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
