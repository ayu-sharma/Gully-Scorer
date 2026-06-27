"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useEffect, type ReactNode } from "react";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** When false the sheet can't be dismissed by backdrop / drag / handle. */
  dismissible?: boolean;
  footer?: ReactNode;
}

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  dismissible = true,
  footer,
}: BottomSheetProps) {
  // Lock background scroll while a sheet is open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (dismissible && (info.offset.y > 120 || info.velocity.y > 600)) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => dismissible && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="glass-strong relative mx-auto w-full max-w-md rounded-t-4xl border-b-0 px-5 pb-[calc(var(--safe-bottom)+1.25rem)] pt-3 shadow-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag={dismissible ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
          >
            {/* Grab handle */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />

            {(title || subtitle) && (
              <div className="mb-4 px-1">
                {title && <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>}
                {subtitle && <p className="mt-0.5 text-sm text-white/55">{subtitle}</p>}
              </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto no-scrollbar">{children}</div>

            {footer && <div className="mt-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
