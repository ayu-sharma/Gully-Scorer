"use client";

import { motion } from "framer-motion";
import { useId } from "react";

export interface Segment<T extends string> {
  value: T;
  label: string;
  emoji?: string;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = "md",
}: {
  segments: Segment<T>[];
  value: T | null;
  onChange: (value: T) => void;
  size?: "md" | "lg";
}) {
  const layoutId = useId();
  const pad = size === "lg" ? "py-4 text-lg" : "py-3 text-base";

  return (
    <div className="flex gap-1.5 rounded-3xl border border-white/10 bg-white/[0.05] p-1.5">
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <button
            key={seg.value}
            type="button"
            onClick={() => onChange(seg.value)}
            className={`relative flex-1 rounded-2xl px-2 text-center font-bold transition-colors ${pad} ${
              active ? "text-ink-950" : "text-white/70 hover:text-white"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${layoutId}`}
                className="absolute inset-0 rounded-2xl bg-brand-400 shadow-glow"
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
              {seg.emoji && <span>{seg.emoji}</span>}
              {seg.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
