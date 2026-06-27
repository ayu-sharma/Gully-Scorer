"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { RUN_BUTTONS } from "@/constants";

export interface ScoringPadProps {
  onRun: (runs: number) => void;
  onWide: () => void;
  onNoBall: () => void;
  onBye: () => void;
  onLegBye: () => void;
  onOut: () => void;
  onUndo: () => void;
  onEndInnings: () => void;
  onChangeBowler: () => void;
  onRetireHurt: () => void;
  canUndo: boolean;
  disabled?: boolean;
}

type Tone = "run" | "four" | "six" | "out" | "extra" | "undo" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  run: "bg-white/[0.08] text-white active:bg-white/20",
  four: "bg-info-500/90 text-ink-950 active:bg-info-500",
  six: "bg-brand-500 text-ink-950 shadow-glow active:bg-brand-600",
  out: "bg-danger-500 text-white shadow-glow-danger active:bg-danger-600",
  extra: "bg-accent-500/15 text-accent-400 border border-accent-400/30 active:bg-accent-500/30",
  undo: "bg-white/[0.08] text-white/80 active:bg-white/20",
  neutral: "glass text-white/85 active:bg-white/10",
};

function Key({
  children,
  onClick,
  tone = "run",
  disabled,
  className = "",
  big = false,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: Tone;
  disabled?: boolean;
  className?: string;
  big?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.93 }}
      disabled={disabled}
      onClick={onClick}
      className={`flex select-none items-center justify-center rounded-2xl font-extrabold tracking-tight transition-colors disabled:opacity-40 ${
        big ? "min-h-[54px] sm:min-h-[60px] text-2xl sm:text-3xl" : "min-h-[36px] sm:min-h-[52px] text-sm"
      } ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function ScoringPad(props: ScoringPadProps) {
  const { disabled } = props;

  const runTone = (r: number): Tone => (r === 6 ? "six" : r === 4 ? "four" : "run");

  return (
    <div className="space-y-1.5 sm:space-y-2.5">
      {/* Runs */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        {RUN_BUTTONS.map((r) => (
          <Key key={r} big tone={runTone(r)} disabled={disabled} onClick={() => props.onRun(r)}>
            {r}
          </Key>
        ))}
      </div>

      {/* Wicket + extras + undo */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        <Key tone="out" disabled={disabled} onClick={props.onOut}>
          OUT
        </Key>
        <Key tone="extra" disabled={disabled} onClick={props.onWide}>
          WD
        </Key>
        <Key tone="extra" disabled={disabled} onClick={props.onNoBall}>
          NB
        </Key>
        <Key tone="extra" disabled={disabled} onClick={props.onLegBye}>
          LB
        </Key>
        <Key tone="extra" disabled={disabled} onClick={props.onBye}>
          BYE
        </Key>
        <Key tone="undo" disabled={!props.canUndo} onClick={props.onUndo}>
          ↩ UNDO
        </Key>
      </div>

      {/* Match controls */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        <Key tone="neutral" className="text-xs sm:text-sm" onClick={props.onEndInnings}>
          End Innings
        </Key>
        <Key tone="neutral" className="text-xs sm:text-sm" disabled={disabled} onClick={props.onChangeBowler}>
          Change Bowler
        </Key>
        <Key tone="neutral" className="text-xs sm:text-sm" disabled={disabled} onClick={props.onRetireHurt}>
          Retired Hurt
        </Key>
      </div>
    </div>
  );
}
