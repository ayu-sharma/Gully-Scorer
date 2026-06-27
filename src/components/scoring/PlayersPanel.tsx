"use client";

import { motion } from "framer-motion";

import type { BatsmanInnings, BowlerInnings, Innings, MatchState } from "@/types";
import { currentBowler, nonStriker, playerName, striker } from "@/utils/cricket";
import { economy, oversDisplay, strikeRate } from "@/utils/format";

function HeaderRow({ cols }: { cols: string[] }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-white/35">
      <span />
      <div className="grid w-[156px] sm:w-[176px] grid-cols-4 gap-x-1.5 text-right">
        {cols.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
    </div>
  );
}

function BatsmanRow({
  match,
  bat,
  onStrike,
}: {
  match: MatchState;
  bat: BatsmanInnings;
  onStrike: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-2xl px-3 py-2 sm:py-2.5 transition-colors ${
        onStrike ? "bg-brand-500/15" : "bg-transparent"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {onStrike ? (
          <motion.span
            layoutId="strike-dot"
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-400 shadow-glow"
          />
        ) : (
          <span className="h-2.5 w-2.5 shrink-0" />
        )}
        <span className="truncate text-sm sm:text-base font-bold">{playerName(match, bat.playerId)}</span>
      </div>
      <div className="tnum grid w-[156px] sm:w-[176px] grid-cols-4 gap-x-1.5 text-right text-[11px] sm:text-sm font-semibold">
        <span className="text-sm sm:text-base font-extrabold">{bat.runs}</span>
        <span className="text-white/60">{bat.balls}</span>
        <span className="text-white/60">{bat.fours}/{bat.sixes}</span>
        <span className="text-white/60">{strikeRate(bat.runs, bat.balls)}</span>
      </div>
    </div>
  );
}

function BowlerRow({ match, bowl }: { match: MatchState; bowl: BowlerInnings }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2 sm:py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-xs">🏏</span>
        <span className="truncate text-sm sm:text-base font-bold text-white/90">
          {playerName(match, bowl.playerId)}
        </span>
      </div>
      <div className="tnum grid w-[156px] sm:w-[176px] grid-cols-4 gap-x-1.5 text-right text-[11px] sm:text-sm font-semibold">
        <span className="text-sm sm:text-base font-extrabold">{oversDisplay(bowl.balls)}</span>
        <span className="text-white/60">{bowl.runsConceded}</span>
        <span className="text-white/60">{bowl.wickets}</span>
        <span className="text-white/60">{economy(bowl.runsConceded, bowl.balls)}</span>
      </div>
    </div>
  );
}

export function PlayersPanel({ match, innings }: { match: MatchState; innings: Innings }) {
  const s = striker(innings);
  const ns = nonStriker(innings);
  const bowl = currentBowler(innings);

  return (
    <div className="card p-2">
      <HeaderRow cols={["R", "B", "4/6", "SR"]} />
      <div className="mt-0.5 space-y-0.5">
        {s && <BatsmanRow match={match} bat={s} onStrike />}
        {ns && <BatsmanRow match={match} bat={ns} onStrike={false} />}
      </div>
      <div className="my-1.5 border-t border-white/10" />
      <HeaderRow cols={["O", "R", "W", "ECO"]} />
      <div className="mt-0.5">
        {bowl ? (
          <BowlerRow match={match} bowl={bowl} />
        ) : (
          <p className="px-3 py-2.5 text-sm text-white/40">Select a bowler…</p>
        )}
      </div>
    </div>
  );
}
