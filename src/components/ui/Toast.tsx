"use client";

/**
 * Lightweight toast system: a provider, a portal-free viewport pinned to the
 * top of the screen, and a `useToast()` hook. Animated with Framer Motion.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { uid } from "@/utils/id";

export type ToastVariant = "default" | "success" | "error" | "info" | "wicket";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  emoji?: string;
}

interface ToastContextValue {
  show: (message: string, opts?: { variant?: ToastVariant; emoji?: string; duration?: number }) => void;
  success: (message: string, emoji?: string) => void;
  error: (message: string, emoji?: string) => void;
  info: (message: string, emoji?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "bg-ink-800/90 border-white/15 text-white",
  success: "bg-brand-500/90 border-brand-300/40 text-ink-950",
  error: "bg-danger-500/90 border-danger-400/40 text-white",
  info: "bg-info-500/90 border-info-400/40 text-ink-950",
  wicket: "bg-danger-600/95 border-danger-400/50 text-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback<ToastContextValue["show"]>(
    (message, opts) => {
      const id = uid("toast");
      const toast: Toast = {
        id,
        message,
        variant: opts?.variant ?? "default",
        emoji: opts?.emoji,
      };
      setToasts((prev) => [...prev.slice(-2), toast]); // keep at most 3
      const timer = setTimeout(() => dismiss(id), opts?.duration ?? 2200);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message, emoji) => show(message, { variant: "success", emoji }),
      error: (message, emoji) => show(message, { variant: "error", emoji }),
      info: (message, emoji) => show(message, { variant: "info", emoji }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[calc(var(--safe-top)+0.75rem)]">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.button
              key={toast.id}
              type="button"
              onClick={() => dismiss(toast.id)}
              initial={{ opacity: 0, y: -24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-card backdrop-blur-xl ${
                VARIANT_STYLES[toast.variant]
              }`}
            >
              {toast.emoji && <span className="text-lg">{toast.emoji}</span>}
              <span className="text-left">{toast.message}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}
