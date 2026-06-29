/**
 * Pure cricket selectors & calculations derived from match state.
 *
 * Nothing here mutates state. Every "live" number the UI shows (rates,
 * partnerships, this-over strip, result margin…) is computed on demand so it
 * can never drift from the source-of-truth ball log.
 */

import { BALLS_PER_OVER } from "@/constants";
import type {
  BatsmanInnings,
  BallEvent,
  BowlerInnings,
  Innings,
  MatchResult,
  MatchState,
  Player,
  Team,
} from "@/types";
import { oversDisplay } from "@/utils/format";

// ── Team / player lookups ───────────────────────────────────────────────────

export function getTeamById(match: MatchState, teamId: string): Team {
  return match.teamA.id === teamId ? match.teamA : match.teamB;
}

export function getOtherTeam(match: MatchState, teamId: string): Team {
  return match.teamA.id === teamId ? match.teamB : match.teamA;
}

export function findPlayer(match: MatchState, playerId: string | null | undefined): Player | null {
  if (!playerId) return null;
  return (
    match.teamA.players.find((p) => p.id === playerId) ??
    match.teamB.players.find((p) => p.id === playerId) ??
    null
  );
}

export function playerName(match: MatchState, playerId: string | null | undefined): string {
  return findPlayer(match, playerId)?.name ?? "—";
}

// ── Innings accessors ─────────────────────────────────────────────────────────

export function currentInnings(match: MatchState): Innings | null {
  return match.innings[match.currentInningsIndex] ?? null;
}

export function maxWickets(match: MatchState): number {
  return match.playersPerSide - 1;
}

export function getBatsman(innings: Innings, playerId: string | null): BatsmanInnings | null {
  if (!playerId) return null;
  return innings.batsmen.find((b) => b.playerId === playerId) ?? null;
}

export function getBowler(innings: Innings, playerId: string | null): BowlerInnings | null {
  if (!playerId) return null;
  return innings.bowlers.find((b) => b.playerId === playerId) ?? null;
}

export function striker(innings: Innings): BatsmanInnings | null {
  return getBatsman(innings, innings.strikerId);
}

export function nonStriker(innings: Innings): BatsmanInnings | null {
  return getBatsman(innings, innings.nonStrikerId);
}

export function currentBowler(innings: Innings): BowlerInnings | null {
  return getBowler(innings, innings.currentBowlerId);
}

// ── Over / ball strips ────────────────────────────────────────────────────────

/** Zero-based index of the over currently in progress. */
export function currentOverIndex(innings: Innings): number {
  return Math.floor(innings.legalBalls / BALLS_PER_OVER);
}

/** Ball events belonging to the over in progress (includes wides / no-balls). */
export function thisOverBalls(innings: Innings): BallEvent[] {
  const over = currentOverIndex(innings);
  return innings.balls.filter((b) => b.over === over);
}

/** Last N delivery labels overall (most recent last). */
export function lastBalls(innings: Innings, count = 6): BallEvent[] {
  return innings.balls.slice(-count);
}

export function ballsBowledThisOver(innings: Innings): number {
  return innings.legalBalls % BALLS_PER_OVER;
}

// ── Match progress ────────────────────────────────────────────────────────────

export function totalBalls(match: MatchState): number {
  return match.oversPerInnings * BALLS_PER_OVER;
}

export function ballsRemaining(match: MatchState, innings: Innings): number {
  return Math.max(0, totalBalls(match) - innings.legalBalls);
}

/** Runs the chasing side still needs (second innings only). */
export function runsNeeded(match: MatchState, innings: Innings): number | null {
  if (match.target == null) return null;
  return Math.max(0, match.target - innings.runs);
}

// ── Availability for selection sheets ────────────────────────────────────────

/**
 * Batsmen eligible to come in: yet-to-bat or returning retired players, minus
 * whoever is currently at the crease.
 */
export function availableBatsmen(match: MatchState, innings: Innings): Player[] {
  const team = getTeamById(match, innings.battingTeamId);
  const atCrease = new Set([innings.strikerId, innings.nonStrikerId].filter(Boolean) as string[]);
  return team.players.filter((p) => {
    if (atCrease.has(p.id)) return false;
    const record = getBatsman(innings, p.id);
    if (!record) return true; // not yet recorded → yet to bat
    return record.status === "did_not_bat" || record.status === "retired";
  });
}

/**
 * Bowlers eligible for the next over: the whole bowling side except the bowler
 * who bowled the previous over (no consecutive overs).
 */
export function availableBowlers(match: MatchState, innings: Innings): Player[] {
  const team = getTeamById(match, innings.bowlingTeamId);
  return team.players.filter((p) => p.id !== innings.previousBowlerId);
}

// ── Prompts the scoring screen reacts to ─────────────────────────────────────

export function needsNewBatsman(_match: MatchState, innings: Innings | null): boolean {
  if (!innings || innings.isComplete) return false;
  return innings.strikerId == null || innings.nonStrikerId == null;
}

export function needsNewBowler(match: MatchState, innings: Innings | null): boolean {
  if (!innings || innings.isComplete) return false;
  // Only prompt once both batsmen are set, so the new-batsman sheet wins.
  if (needsNewBatsman(match, innings)) return false;
  return innings.currentBowlerId == null;
}

// ── Result ────────────────────────────────────────────────────────────────────

/**
 * Compute the match result after the second innings ends. Assumes both innings
 * exist and the chase has concluded (target met, all out, or overs done).
 */
export function computeResult(match: MatchState): MatchResult {
  const first = match.innings[0];
  const second = match.innings[1];
  const firstTeam = getTeamById(match, first.battingTeamId);
  const secondTeam = getTeamById(match, second.battingTeamId);

  // Chasing side overhauled the target.
  if (match.target != null && second.runs >= match.target) {
    const wicketsInHand = maxWickets(match) - second.wickets;
    return {
      winnerTeamId: secondTeam.id,
      isTie: false,
      margin: wicketsInHand,
      marginType: "wickets",
      summary: `${secondTeam.name} won by ${wicketsInHand} ${
        wicketsInHand === 1 ? "wicket" : "wickets"
      }`,
    };
  }

  if (second.runs === first.runs) {
    return {
      winnerTeamId: null,
      isTie: true,
      margin: 0,
      marginType: null,
      summary: "Match tied",
    };
  }

  // Side batting first defended the total.
  const margin = first.runs - second.runs;
  return {
    winnerTeamId: firstTeam.id,
    isTie: false,
    margin,
    marginType: "runs",
    summary: `${firstTeam.name} won by ${margin} ${margin === 1 ? "run" : "runs"}`,
  };
}

/** Sorted batting card: those who batted (in order) then the rest. */
export function battingCard(innings: Innings): BatsmanInnings[] {
  return [...innings.batsmen].sort((a, b) => {
    const aBatted = a.battingOrder > 0;
    const bBatted = b.battingOrder > 0;
    if (aBatted && bBatted) return a.battingOrder - b.battingOrder;
    if (aBatted) return -1;
    if (bBatted) return 1;
    return 0;
  });
}

/** Bowling card: bowlers who have sent down at least one ball, in spell order. */
export function bowlingCard(innings: Innings): BowlerInnings[] {
  return innings.bowlers.filter((b) => b.balls > 0 || b.runsConceded > 0);
}

/** Overs-bowled label for a bowler, e.g. "3.2". */
export function bowlerOvers(bowler: BowlerInnings): string {
  return oversDisplay(bowler.balls);
}
