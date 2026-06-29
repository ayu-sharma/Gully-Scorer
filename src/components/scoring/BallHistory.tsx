"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { BallEvent, SoloBallEvent } from "@/types";

type HistoryBall = BallEvent | SoloBallEvent;

function chipStyle(ball: HistoryBall): string {
  if (ball.isWicket) return "bg-danger-500 text-white border-danger-400";
  if (ball.extraType === "wide" || ball.extraType === "noball")
    return "bg-accent-500/90 text-ink-950 border-accent-400";
  if (ball.extraType === "bye" || ball.extraType === "legbye")
    return "bg-info-500/80 text-ink-950 border-info-400";
  if (ball.runsOffBat === 6) return "bg-brand-500 text-ink-950 border-brand-300";
  if (ball.runsOffBat === 4) return "bg-info-500 text-ink-950 border-info-400";
  if (ball.runsOffBat === 0) return "bg-white/10 text-white/70 border-white/15";
  return "bg-white/20 text-white border-white/25";
}

export function BallChip({ ball, size = "md" }: { ball: HistoryBall; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 min-w-8 text-xs" : "h-10 min-w-10 text-sm";
  return (
    <motion.span
      layout
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
      className={`tnum inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 font-extrabold ${dim} ${chipStyle(
        ball,
      )}`}
    >
      {ball.label}
    </motion.span>
  );
}

/** Horizontal strip of deliveries (this over or the last six balls). */
export function BallHistory({
  balls,
  label,
  emptyHint = "—",
}: {
  balls: HistoryBall[];
  label: string;
  emptyHint?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </span>
      <div className="flex flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar">
        <AnimatePresence initial={false}>
          {balls.length === 0 ? (
            <span className="text-sm text-white/30">{emptyHint}</span>
          ) : (
            balls.map((b) => <BallChip key={b.id} ball={b} size="sm" />)
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
