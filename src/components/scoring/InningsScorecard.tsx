"use client";

import type { BatsmanInnings, Dismissal, Innings, MatchState } from "@/types";
import {
  battingCard,
  bowlingCard,
  getTeamById,
  playerName,
} from "@/utils/cricket";
import { economy, oversDisplay, strikeRate } from "@/utils/format";

function dismissalText(match: MatchState, bat: BatsmanInnings): string {
  if (bat.status === "not_out") return "not out";
  if (bat.status === "did_not_bat") return "did not bat";
  if (bat.status === "retired") return "retired hurt";
  const d: Dismissal | null = bat.dismissal;
  if (!d) return "out";
  const bowler = d.bowlerId ? playerName(match, d.bowlerId) : "";
  switch (d.type) {
    case "bowled":
      return `b ${bowler}`;
    case "lbw":
      return `lbw b ${bowler}`;
    case "caught":
      return `c & b ${bowler}`;
    case "stumped":
      return `st b ${bowler}`;
    case "hit_wicket":
      return `hit wkt b ${bowler}`;
    case "run_out":
      return "run out";
    case "retired_hurt":
      return "retired hurt";
    default:
      return "out";
  }
}

export function InningsScorecard({ match, innings }: { match: MatchState; innings: Innings }) {
  const team = getTeamById(match, innings.battingTeamId);
  const bats = battingCard(innings).filter((b) => b.battingOrder > 0);
  const battedIds = new Set(bats.map((b) => b.playerId));
  // Anyone in the batting XI who never came to the crease.
  const didNotBat = team.players.filter((p) => !battedIds.has(p.id)).map((p) => p.name);

  const bowlers = bowlingCard(innings);
  const e = innings.extras;

  return (
    <div className="space-y-3">
      {/* Batting */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between bg-white/[0.04] px-4 py-3">
          <h3 className="font-extrabold">{team.name}</h3>
          <span className="tnum text-lg font-black">
            {innings.runs}/{innings.wickets}{" "}
            <span className="text-sm font-semibold text-white/45">({oversDisplay(innings.legalBalls)})</span>
          </span>
        </div>

        <div className="grid grid-cols-[1fr_repeat(4,2.2rem)] gap-x-1 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          <span>Batter</span>
          <span className="text-right">R</span>
          <span className="text-right">B</span>
          <span className="text-right">4/6</span>
          <span className="text-right">SR</span>
        </div>

        <div className="divide-y divide-white/5">
          {bats.map((bat) => (
            <div
              key={bat.playerId}
              className="grid grid-cols-[1fr_repeat(4,2.2rem)] items-center gap-x-1 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {playerName(match, bat.playerId)}
                  {bat.status === "not_out" && <span className="text-brand-400"> *</span>}
                </p>
                <p className="truncate text-[11px] text-white/45">{dismissalText(match, bat)}</p>
              </div>
              <span className="tnum text-right text-sm font-extrabold">{bat.runs}</span>
              <span className="tnum text-right text-sm text-white/60">{bat.balls}</span>
              <span className="tnum text-right text-sm text-white/60">
                {bat.fours}/{bat.sixes}
              </span>
              <span className="tnum text-right text-sm text-white/60">
                {strikeRate(bat.runs, bat.balls)}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t border-white/10 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="font-semibold text-white/60">Extras</span>
            <span className="tnum font-semibold">
              {e.total}{" "}
              <span className="text-white/40">
                (b {e.byes}, lb {e.legbyes}, w {e.wides}, nb {e.noballs})
              </span>
            </span>
          </div>
          <div className="flex justify-between text-base">
            <span className="font-extrabold">Total</span>
            <span className="tnum font-black">
              {innings.runs}/{innings.wickets}{" "}
              <span className="text-sm font-semibold text-white/45">
                ({oversDisplay(innings.legalBalls)} ov)
              </span>
            </span>
          </div>
          {didNotBat.length > 0 && (
            <p className="pt-1 text-[11px] text-white/40">
              <span className="font-semibold">Did not bat: </span>
              {didNotBat.join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Fall of wickets */}
      {innings.fallOfWickets.length > 0 && (
        <div className="card p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">
            Fall of wickets
          </h4>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
            {innings.fallOfWickets.map((f) => (
              <span key={f.wicketNumber} className="tnum text-white/70">
                <span className="font-bold text-white">{f.runs}</span>-{f.wicketNumber}{" "}
                <span className="text-white/45">({f.batsmanName}, {f.over})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bowling */}
      {bowlers.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-[1fr_repeat(5,2rem)] gap-x-1 bg-white/[0.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <span>Bowler</span>
            <span className="text-right">O</span>
            <span className="text-right">M</span>
            <span className="text-right">R</span>
            <span className="text-right">W</span>
            <span className="text-right">Econ</span>
          </div>
          <div className="divide-y divide-white/5">
            {bowlers.map((b) => (
              <div
                key={b.playerId}
                className="grid grid-cols-[1fr_repeat(5,2rem)] items-center gap-x-1 px-4 py-2.5"
              >
                <span className="truncate text-sm font-bold">{playerName(match, b.playerId)}</span>
                <span className="tnum text-right text-sm">{oversDisplay(b.balls)}</span>
                <span className="tnum text-right text-sm text-white/60">{b.maidens}</span>
                <span className="tnum text-right text-sm text-white/60">{b.runsConceded}</span>
                <span className="tnum text-right text-sm font-extrabold">{b.wickets}</span>
                <span className="tnum text-right text-sm text-white/60">
                  {economy(b.runsConceded, b.balls)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
