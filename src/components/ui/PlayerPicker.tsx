"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import type { Player } from "@/types";

export interface PlayerPickerProps {
  players: Player[];
  onSelect: (playerId: string) => void;
  selectedId?: string | null;
  /** Optional trailing content per player (e.g. live bowling figures). */
  meta?: (player: Player) => ReactNode;
  emptyLabel?: string;
}

/** A tap-to-pick vertical list of players. Used for batsman / bowler sheets. */
export function PlayerPicker({
  players,
  onSelect,
  selectedId,
  meta,
  emptyLabel = "No players available",
}: PlayerPickerProps) {
  if (players.length === 0) {
    return <p className="py-6 text-center text-sm text-white/50">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {players.map((player, i) => {
        const active = selectedId === player.id;
        return (
          <motion.button
            key={player.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(player.id)}
            className={`flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
              active
                ? "border-brand-400 bg-brand-500/20"
                : "border-white/10 bg-white/[0.05] active:bg-white/10"
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/70">
                {i + 1}
              </span>
              <span className="text-base font-bold">{player.name}</span>
            </span>
            {meta && <span className="text-sm text-white/55">{meta(player)}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
