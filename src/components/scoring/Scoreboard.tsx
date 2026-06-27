"use client";

import { motion } from "framer-motion";

import { BallHistory } from "@/components/scoring/BallHistory";
import { StatTile } from "@/components/ui/Card";
import type { Innings, MatchState } from "@/types";
import {
  ballsRemaining,
  getTeamById,
  runsNeeded,
  thisOverBalls,
} from "@/utils/cricket";
import { oversDisplay, requiredRunRate, runRate } from "@/utils/format";

export function Scoreboard({ match, innings }: { match: MatchState; innings: Innings }) {
  const battingTeam = getTeamById(match, innings.battingTeamId);
  const isChasing = innings.index === 1 && match.target != null;
  const need = runsNeeded(match, innings);
  const remaining = ballsRemaining(match, innings);

  return (
    <div className="card overflow-hidden p-3 sm:p-4">
      {/* Team + chase line */}
      <div className="flex items-baseline justify-between">
        <span className="truncate text-sm font-bold text-white/80">{battingTeam.name}</span>
        <span className="text-[11px] font-semibold text-white/45">
          {match.oversPerInnings} overs · Innings {innings.index + 1}
        </span>
      </div>

      {/* Big score */}
      <div className="mt-1 flex items-end justify-between">
        <motion.div
          key={`${innings.runs}-${innings.wickets}`}
          initial={{ scale: 0.9, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className="tnum text-4xl sm:text-5xl font-black leading-none tracking-tight"
        >
          {innings.runs}
          <span className="text-white/50">/</span>
          {innings.wickets}
        </motion.div>
        <div className="tnum text-right text-sm sm:text-base font-bold text-white/70">
          {oversDisplay(innings.legalBalls)}
          <span className="text-white/35"> / {match.oversPerInnings}</span>
          <div className="text-[11px] font-semibold text-white/40">overs</div>
        </div>
      </div>

      {isChasing && need != null && (
        <div className="mt-2 rounded-2xl bg-accent-500/15 px-3 py-2 text-center text-sm font-bold text-accent-400">
          {need > 0 ? (
            <>
              Need <span className="tnum">{need}</span> from <span className="tnum">{remaining}</span>{" "}
              {remaining === 1 ? "ball" : "balls"}
            </>
          ) : (
            "Target reached"
          )}
        </div>
      )}

      {/* Stat row */}
      <div className="mt-2 sm:mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
        <StatTile label="CRR" value={runRate(innings.runs, innings.legalBalls)} accent="brand" />
        {isChasing ? (
          <StatTile
            label="RRR"
            value={requiredRunRate(need ?? 0, remaining)}
            accent="accent"
          />
        ) : (
          <StatTile label="Extras" value={innings.extras.total} />
        )}
        <StatTile
          label="P'SHIP"
          value={innings.partnership.runs}
          sub={`${innings.partnership.balls}b`}
          accent="info"
        />
        {isChasing ? (
          <StatTile label="Target" value={match.target ?? "—"} accent="danger" />
        ) : (
          <StatTile label="Wkts" value={`${innings.wickets}/${match.playersPerSide - 1}`} />
        )}
      </div>

      {/* Ball strips */}
      <div className="mt-2 sm:mt-3 border-t border-white/10 pt-2 sm:pt-3">
        <BallHistory label="This over" balls={thisOverBalls(innings)} emptyHint="New over" />
      </div>
    </div>
  );
}
