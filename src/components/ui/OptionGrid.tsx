"use client";

/**
 * A responsive grid of large, tappable tiles — the core "zero typing" control
 * used across the scoring sheets (run amounts, dismissal types, players…).
 */

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export interface GridOption<T> {
  value: T;
  label: ReactNode;
  sub?: ReactNode;
  emoji?: string;
  tone?: "default" | "brand" | "danger" | "accent";
}

const TONES = {
  default: "border-white/10 bg-white/[0.06] text-white active:bg-white/15",
  brand: "border-brand-400/40 bg-brand-500/15 text-brand-100 active:bg-brand-500/30",
  danger: "border-danger-400/40 bg-danger-500/15 text-danger-400 active:bg-danger-500/30",
  accent: "border-accent-400/40 bg-accent-500/15 text-accent-400 active:bg-accent-500/30",
} as const;

export function OptionGrid<T extends string | number>({
  options,
  onSelect,
  columns = 3,
  selected,
}: {
  options: GridOption<T>[];
  onSelect: (value: T) => void;
  columns?: 2 | 3 | 4;
  selected?: T;
}) {
  const cols = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[columns];
  return (
    <div className={`grid gap-2.5 ${cols}`}>
      {options.map((opt) => {
        const isSel = selected !== undefined && selected === opt.value;
        return (
          <motion.button
            key={String(opt.value)}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => onSelect(opt.value)}
            className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 py-3 text-center font-extrabold transition-colors ${
              TONES[opt.tone ?? "default"]
            } ${isSel ? "ring-2 ring-brand-400 ring-offset-2 ring-offset-ink-850" : ""}`}
          >
            {opt.emoji && <span className="text-xl leading-none">{opt.emoji}</span>}
            <span className="text-xl leading-tight">{opt.label}</span>
            {opt.sub && <span className="text-[11px] font-medium text-white/50">{opt.sub}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
