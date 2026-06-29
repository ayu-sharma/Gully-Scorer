/**
 * The cricket scoring engine.
 *
 * A single pure reducer owns the entire match. Every delivery produces a brand
 * new immutable `MatchState`; the previous state is pushed onto an in-memory
 * `past` stack so UNDO restores the prior delivery *exactly* — no fragile
 * reverse-arithmetic. Derived numbers are never stored (see utils/cricket.ts).
 */

import { BALLS_PER_OVER, BOWLER_CREDITED_DISMISSALS } from "@/constants";
import type {
  AppMatch,
  BallEvent,
  BatsmanInnings,
  BowlerInnings,
  Dismissal,
  DismissalType,
  ExtraType,
  Innings,
  MatchState,
  Player,
  SoloBallEvent,
  SoloMatch,
  SoloPlayer,
  SoloTurn,
  Team,
} from "@/types";
import {
  computeResult,
  currentOverIndex,
  getBowler,
  maxWickets,
  playerName,
  totalBalls,
} from "@/utils/cricket";
import { oversDisplay } from "@/utils/format";
import { uid } from "@/utils/id";

const MAX_UNDO = 200;

// ────────────────────────────────────────────────────────────────────────────
// Reducer state & actions
// ────────────────────────────────────────────────────────────────────────────

export interface AppState {
  match: AppMatch | null;
  /** Undo stack of prior match states (in-memory; not persisted). */
  past: AppMatch[];
}

export const initialState: AppState = { match: null, past: [] };

export type Action =
  | { type: "LOAD"; match: AppMatch | null }
  | {
      type: "INIT_MATCH";
      teamAName: string;
      teamBName: string;
      teamAPlayers: string[];
      teamBPlayers: string[];
      overs: number;
      playersPerSide: number;
    }
  | {
      type: "INIT_SOLO_MATCH";
      players: string[];
      oversPerPlayer: number | null;
    }
  | { type: "START_SOLO_TURN"; bowlerId: string }
  | { type: "SOLO_SCORE_RUNS"; runs: number }
  | { type: "SOLO_WIDE"; additionalRuns: number }
  | { type: "SOLO_NOBALL"; runsOffBat: number }
  | { type: "SOLO_BYE"; runs: number }
  | { type: "SOLO_LEGBYE"; runs: number }
  | { type: "SOLO_WICKET" }
  | { type: "SOLO_NEW_BOWLER"; bowlerId: string }
  | { type: "SOLO_END_TURN" }
  | {
      type: "SET_TOSS";
      callerTeamId: string;
      call: "heads" | "tails";
      result: "heads" | "tails";
      winnerTeamId: string;
      decision: "bat" | "bowl";
    }
  | {
      type: "START_INNINGS";
      strikerId: string;
      nonStrikerId: string;
      bowlerId: string;
    }
  | { type: "SCORE_RUNS"; runs: number }
  | { type: "WIDE"; additionalRuns: number }
  | { type: "NOBALL"; runsOffBat: number }
  | { type: "BYE"; runs: number }
  | { type: "LEGBYE"; runs: number }
  | {
      type: "WICKET";
      dismissalType: DismissalType;
      outBatsmanId?: string;
      runsCompleted?: number;
    }
  | { type: "NEW_BATSMAN"; playerId: string }
  | { type: "NEW_BOWLER"; bowlerId: string }
  | { type: "RETIRE_HURT" }
  | { type: "END_INNINGS" }
  | { type: "END_MATCH" }
  | { type: "UNDO" }
  | { type: "NEW_MATCH" };

// ────────────────────────────────────────────────────────────────────────────
// Factories
// ────────────────────────────────────────────────────────────────────────────

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeTeam(name: string, players: string[]): Team {
  return {
    id: uid("team"),
    name,
    players: players.map<Player>((p) => ({ id: uid("plyr"), name: p })),
  };
}

function createInnings(index: number, battingTeamId: string, bowlingTeamId: string): Innings {
  return {
    index,
    battingTeamId,
    bowlingTeamId,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, total: 0 },
    batsmen: [],
    bowlers: [],
    balls: [],
    fallOfWickets: [],
    partnership: { batsman1Id: "", batsman2Id: "", runs: 0, balls: 0 },
    strikerId: null,
    nonStrikerId: null,
    currentBowlerId: null,
    previousBowlerId: null,
    isComplete: false,
    endReason: null,
  };
}

function createMatch(
  teamA: Team,
  teamB: Team,
  overs: number,
  playersPerSide: number,
): MatchState {
  const now = Date.now();
  return {
    mode: "team",
    id: uid("match"),
    createdAt: now,
    updatedAt: now,
    teamA,
    teamB,
    oversPerInnings: overs,
    playersPerSide,
    toss: null,
    innings: [],
    currentInningsIndex: 0,
    status: "setup",
    target: null,
    result: null,
  };
}

function makeSoloPlayers(players: string[]): SoloPlayer[] {
  return players.map((name) => ({ id: uid("solo"), name }));
}

function createSoloTurn(index: number, batterId: string, suggestedBowlerId: string | null): SoloTurn {
  return {
    index,
    batterId,
    bowlerId: suggestedBowlerId,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    balls: [],
    fours: 0,
    sixes: 0,
    extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, total: 0 },
    isComplete: false,
    endReason: null,
  };
}

function createSoloMatch(players: SoloPlayer[], oversPerPlayer: number | null): SoloMatch {
  const now = Date.now();
  return {
    mode: "solo",
    id: uid("solo_match"),
    createdAt: now,
    updatedAt: now,
    players,
    oversPerPlayer,
    turns: [createSoloTurn(0, players[0].id, players[1]?.id ?? null)],
    currentTurnIndex: 0,
    status: "select_players",
    suggestedBowlerId: players[1]?.id ?? null,
    result: null,
  };
}

function soloPlayerName(match: SoloMatch, playerId: string | null | undefined): string {
  if (!playerId) return "—";
  return match.players.find((p) => p.id === playerId)?.name ?? "—";
}

function soloBallsPerTurn(match: SoloMatch): number | null {
  return match.oversPerPlayer == null ? null : match.oversPerPlayer * BALLS_PER_OVER;
}

function computeSoloResult(match: SoloMatch) {
  const completed = match.turns.filter((t) => t.isComplete);
  const bestRuns = Math.max(...completed.map((t) => t.runs));
  const runLeaders = completed.filter((t) => t.runs === bestRuns);
  const fewestWickets = Math.min(...runLeaders.map((t) => t.wickets));
  const leaders = runLeaders.filter((t) => t.wickets === fewestWickets);
  if (leaders.length !== 1) {
    return {
      winnerPlayerId: null,
      isTie: true,
      summary: `Match tied at ${bestRuns} run${bestRuns === 1 ? "" : "s"}`,
    };
  }
  const winner = leaders[0];
  return {
    winnerPlayerId: winner.batterId,
    isTie: false,
    summary: `${soloPlayerName(match, winner.batterId)} won with ${winner.runs}/${winner.wickets}`,
  };
}

// ── Record helpers ────────────────────────────────────────────────────────────

function nextBattingOrder(innings: Innings): number {
  const max = innings.batsmen.reduce((m, b) => Math.max(m, b.battingOrder), 0);
  return max + 1;
}

function ensureBatsman(innings: Innings, playerId: string, order?: number): BatsmanInnings {
  let rec = innings.batsmen.find((b) => b.playerId === playerId);
  if (!rec) {
    rec = {
      playerId,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      status: "did_not_bat",
      dismissal: null,
      battingOrder: order ?? nextBattingOrder(innings),
    };
    innings.batsmen.push(rec);
  }
  return rec;
}

function ensureBowler(innings: Innings, playerId: string): BowlerInnings {
  let rec = innings.bowlers.find((b) => b.playerId === playerId);
  if (!rec) {
    rec = {
      playerId,
      balls: 0,
      runsConceded: 0,
      wickets: 0,
      maidens: 0,
      runsThisOver: 0,
      legalBallsThisOver: 0,
    };
    innings.bowlers.push(rec);
  }
  return rec;
}

function swapStrike(innings: Innings): void {
  const tmp = innings.strikerId;
  innings.strikerId = innings.nonStrikerId;
  innings.nonStrikerId = tmp;
}

// ────────────────────────────────────────────────────────────────────────────
// Core delivery application (the single place ball logic lives)
// ────────────────────────────────────────────────────────────────────────────

interface DeliveryInput {
  runsOffBat: number;
  extraRuns: number;
  extraType: ExtraType | null;
  isLegal: boolean;
  isWicket: boolean;
  dismissal: Dismissal | null;
  /** Runs the batsmen physically ran — drives the odd/even strike swap. */
  runsRanForStrike: number;
  /** Runs charged to the bowler's analysis (excludes byes / leg-byes). */
  chargedToBowler: number;
  /** Whether the striker is credited with a ball faced. */
  countsBatsmanBall: boolean;
  label: string;
}

function applyDelivery(match: MatchState, innings: Innings, input: DeliveryInput): void {
  const strikerId = innings.strikerId as string;
  const bowlerId = innings.currentBowlerId as string;

  const ball: BallEvent = {
    id: uid("ball"),
    inningsIndex: innings.index,
    over: currentOverIndex(innings),
    ballInOver: input.isLegal ? (innings.legalBalls % BALLS_PER_OVER) + 1 : 0,
    label: input.label,
    runsOffBat: input.runsOffBat,
    extraRuns: input.extraRuns,
    extraType: input.extraType,
    totalRuns: input.runsOffBat + input.extraRuns,
    isLegal: input.isLegal,
    isWicket: input.isWicket,
    dismissal: input.dismissal,
    strikerId,
    nonStrikerId: innings.nonStrikerId as string,
    bowlerId,
    timestamp: Date.now(),
  };

  // Batsman
  const strikerRec = ensureBatsman(innings, strikerId);
  if (input.countsBatsmanBall) strikerRec.balls += 1;
  strikerRec.runs += input.runsOffBat;
  if (input.extraType === null || input.extraType === "noball") {
    if (input.runsOffBat === 4) strikerRec.fours += 1;
    if (input.runsOffBat === 6) strikerRec.sixes += 1;
  }

  // Bowler
  const bowlerRec = ensureBowler(innings, bowlerId);
  if (input.isLegal) {
    bowlerRec.balls += 1;
    bowlerRec.legalBallsThisOver += 1;
  }
  bowlerRec.runsConceded += input.chargedToBowler;
  bowlerRec.runsThisOver += input.chargedToBowler;

  // Team totals
  innings.runs += ball.totalRuns;
  if (input.isLegal) innings.legalBalls += 1;

  // Extras
  if (input.extraType === "wide") innings.extras.wides += input.extraRuns;
  else if (input.extraType === "noball") innings.extras.noballs += 1;
  else if (input.extraType === "bye") innings.extras.byes += input.extraRuns;
  else if (input.extraType === "legbye") innings.extras.legbyes += input.extraRuns;
  innings.extras.total =
    innings.extras.wides + innings.extras.noballs + innings.extras.byes + innings.extras.legbyes;

  // Partnership
  innings.partnership.runs += ball.totalRuns;
  if (input.isLegal) innings.partnership.balls += 1;

  // Wicket bookkeeping
  if (input.isWicket && input.dismissal) {
    innings.wickets += 1;
    const outRec = ensureBatsman(innings, input.dismissal.batsmanId);
    outRec.status = "out";
    outRec.dismissal = input.dismissal;
    innings.fallOfWickets.push({
      wicketNumber: innings.wickets,
      runs: innings.runs,
      over: oversDisplay(innings.legalBalls),
      batsmanId: input.dismissal.batsmanId,
      batsmanName: playerName(match, input.dismissal.batsmanId),
    });
    if (input.dismissal.bowlerId) bowlerRec.wickets += 1;
  }

  innings.balls.push(ball);

  // Strike rotation for the runs run on this delivery.
  if (input.runsRanForStrike % 2 === 1) swapStrike(innings);

  // Remove the dismissed batsman from the crease (after rotation).
  if (input.isWicket && input.dismissal) {
    const outId = input.dismissal.batsmanId;
    if (innings.strikerId === outId) innings.strikerId = null;
    else if (innings.nonStrikerId === outId) innings.nonStrikerId = null;
  }

  // ── End-of-over & completion ──────────────────────────────────────────────
  const overBoundary = input.isLegal && innings.legalBalls % BALLS_PER_OVER === 0;

  if (overBoundary) {
    const bw = getBowler(innings, innings.currentBowlerId);
    if (bw) {
      if (bw.legalBallsThisOver === BALLS_PER_OVER && bw.runsThisOver === 0) {
        bw.maidens += 1;
      }
      bw.runsThisOver = 0;
      bw.legalBallsThisOver = 0;
    }
  }

  const allOut = innings.wickets >= maxWickets(match);
  const oversComplete = innings.legalBalls >= totalBalls(match);
  const targetReached =
    match.target != null && innings.index === 1 && innings.runs >= match.target;

  if (allOut) {
    innings.isComplete = true;
    innings.endReason = "all_out";
  } else if (oversComplete) {
    innings.isComplete = true;
    innings.endReason = "overs";
  } else if (targetReached) {
    innings.isComplete = true;
    innings.endReason = "target";
  }

  // A completed over (when the innings continues) swaps strike and forces a
  // new bowler to be chosen — a bowler cannot bowl two overs in a row.
  if (!innings.isComplete && overBoundary) {
    swapStrike(innings);
    innings.previousBowlerId = innings.currentBowlerId;
    innings.currentBowlerId = null;
  }
}

function applySoloDelivery(match: SoloMatch, turn: SoloTurn, input: DeliveryInput): void {
  const bowlerId = turn.bowlerId as string;
  const ball: SoloBallEvent = {
    id: uid("ball"),
    turnIndex: turn.index,
    over: Math.floor(turn.legalBalls / BALLS_PER_OVER),
    ballInOver: input.isLegal ? (turn.legalBalls % BALLS_PER_OVER) + 1 : 0,
    label: input.label,
    runsOffBat: input.runsOffBat,
    extraRuns: input.extraRuns,
    extraType: input.extraType,
    totalRuns: input.runsOffBat + input.extraRuns,
    isLegal: input.isLegal,
    isWicket: input.isWicket,
    dismissal: input.dismissal,
    batterId: turn.batterId,
    bowlerId,
    timestamp: Date.now(),
  };

  turn.runs += ball.totalRuns;
  if (input.isLegal) turn.legalBalls += 1;
  if (input.extraType === null || input.extraType === "noball") {
    if (input.runsOffBat === 4) turn.fours += 1;
    if (input.runsOffBat === 6) turn.sixes += 1;
  }

  if (input.extraType === "wide") turn.extras.wides += input.extraRuns;
  else if (input.extraType === "noball") turn.extras.noballs += 1;
  else if (input.extraType === "bye") turn.extras.byes += input.extraRuns;
  else if (input.extraType === "legbye") turn.extras.legbyes += input.extraRuns;
  turn.extras.total =
    turn.extras.wides + turn.extras.noballs + turn.extras.byes + turn.extras.legbyes;

  if (input.isWicket) {
    turn.wickets += 1;
    turn.isComplete = true;
    turn.endReason = "wicket";
    match.suggestedBowlerId = turn.batterId;
  }

  turn.balls.push(ball);

  const ballLimit = soloBallsPerTurn(match);
  if (!turn.isComplete && ballLimit != null && turn.legalBalls >= ballLimit) {
    turn.isComplete = true;
    turn.endReason = "balls";
    match.suggestedBowlerId = null;
  }
}

/**
 * After an innings is flagged complete, advance the match: open the second
 * innings (innings break) or compute the result.
 */
function concludeTransition(match: MatchState): MatchState {
  const inn = match.innings[match.currentInningsIndex];
  if (!inn || !inn.isComplete || match.status !== "live") return match;

  if (match.currentInningsIndex === 0) {
    match.target = inn.runs + 1;
    match.innings[1] = createInnings(1, inn.bowlingTeamId, inn.battingTeamId);
    match.currentInningsIndex = 1;
    match.status = "innings_break";
  } else {
    match.result = computeResult(match);
    match.status = "complete";
  }
  return match;
}

function concludeSoloTransition(match: SoloMatch): SoloMatch {
  const turn = match.turns[match.currentTurnIndex];
  if (!turn || !turn.isComplete || match.status !== "live") return match;

  const nextIndex = match.currentTurnIndex + 1;
  if (nextIndex >= match.players.length) {
    match.result = computeSoloResult(match);
    match.status = "complete";
    return match;
  }

  const nextBatter = match.players[nextIndex];
  match.currentTurnIndex = nextIndex;
  match.turns[nextIndex] = createSoloTurn(nextIndex, nextBatter.id, match.suggestedBowlerId);
  match.status = "select_players";
  return match;
}

// ── Snapshot helpers ──────────────────────────────────────────────────────────

/** Commit a mutated clone, pushing the *previous* state onto the undo stack. */
function commit(state: AppState, match: AppMatch): AppState {
  match.updatedAt = Date.now();
  const past = state.match ? [...state.past, state.match].slice(-MAX_UNDO) : state.past;
  return { match, past };
}

/** Commit a setup/phase boundary, clearing the undo stack (no cross-phase undo). */
function commitFresh(match: AppMatch): AppState {
  match.updatedAt = Date.now();
  return { match, past: [] };
}

/**
 * Commit a continuation of the current delivery (e.g. picking the new batsman
 * after a wicket). Preserves the undo stack so a single UNDO still reverts the
 * whole delivery, including the selection that followed it.
 */
function commitContinue(state: AppState, match: AppMatch): AppState {
  match.updatedAt = Date.now();
  return { match, past: state.past };
}

/** Guard: a delivery is only valid with both batsmen, a bowler, and a live innings. */
function canScore(match: AppMatch | null): match is MatchState {
  if (!match || match.mode !== "team") return false;
  const inn = match.innings[match.currentInningsIndex];
  return Boolean(
    inn &&
      !inn.isComplete &&
      inn.strikerId &&
      inn.nonStrikerId &&
      inn.currentBowlerId &&
      match.status === "live",
  );
}

function canScoreSolo(match: AppMatch | null): match is SoloMatch {
  if (!match || match.mode !== "solo" || match.status !== "live") return false;
  const turn = match.turns[match.currentTurnIndex];
  return Boolean(turn && !turn.isComplete && turn.bowlerId && turn.batterId !== turn.bowlerId);
}

function retireStriker(match: MatchState): void {
  const inn = match.innings[match.currentInningsIndex];
  if (!inn.strikerId) return;
  const rec = ensureBatsman(inn, inn.strikerId);
  rec.status = "retired";
  rec.dismissal = { type: "retired_hurt", batsmanId: inn.strikerId };
  inn.strikerId = null;
}

// ────────────────────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────────────────────

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOAD":
      return { match: action.match, past: [] };

    case "NEW_MATCH":
      return { match: null, past: [] };

    case "INIT_MATCH": {
      const teamA = makeTeam(action.teamAName, action.teamAPlayers);
      const teamB = makeTeam(action.teamBName, action.teamBPlayers);
      const match = createMatch(teamA, teamB, action.overs, action.playersPerSide);
      match.status = "toss";
      return { match, past: [] };
    }

    case "INIT_SOLO_MATCH": {
      const players = makeSoloPlayers(action.players);
      const match = createSoloMatch(players, action.oversPerPlayer);
      return { match, past: [] };
    }

    case "START_SOLO_TURN": {
      if (!state.match || state.match.mode !== "solo") return state;
      const match = clone(state.match);
      const turn = match.turns[match.currentTurnIndex];
      if (!turn || turn.batterId === action.bowlerId) return state;
      turn.bowlerId = action.bowlerId;
      match.status = "live";
      return commitFresh(match);
    }

    case "SOLO_SCORE_RUNS": {
      if (!canScoreSolo(state.match)) return state;
      const match = clone(state.match);
      const turn = match.turns[match.currentTurnIndex];
      applySoloDelivery(match, turn, {
        runsOffBat: action.runs,
        extraRuns: 0,
        extraType: null,
        isLegal: true,
        isWicket: false,
        dismissal: null,
        runsRanForStrike: 0,
        chargedToBowler: action.runs,
        countsBatsmanBall: true,
        label: String(action.runs),
      });
      return commit(state, concludeSoloTransition(match));
    }

    case "SOLO_WIDE": {
      if (!canScoreSolo(state.match)) return state;
      const match = clone(state.match);
      const turn = match.turns[match.currentTurnIndex];
      const total = 1 + action.additionalRuns;
      applySoloDelivery(match, turn, {
        runsOffBat: 0,
        extraRuns: total,
        extraType: "wide",
        isLegal: false,
        isWicket: false,
        dismissal: null,
        runsRanForStrike: 0,
        chargedToBowler: total,
        countsBatsmanBall: false,
        label: total === 1 ? "Wd" : `${total}Wd`,
      });
      return commit(state, concludeSoloTransition(match));
    }

    case "SOLO_NOBALL": {
      if (!canScoreSolo(state.match)) return state;
      const match = clone(state.match);
      const turn = match.turns[match.currentTurnIndex];
      applySoloDelivery(match, turn, {
        runsOffBat: action.runsOffBat,
        extraRuns: 1,
        extraType: "noball",
        isLegal: false,
        isWicket: false,
        dismissal: null,
        runsRanForStrike: 0,
        chargedToBowler: 1 + action.runsOffBat,
        countsBatsmanBall: true,
        label: action.runsOffBat === 0 ? "Nb" : `Nb${action.runsOffBat}`,
      });
      return commit(state, concludeSoloTransition(match));
    }

    case "SOLO_BYE": {
      if (!canScoreSolo(state.match)) return state;
      const match = clone(state.match);
      const turn = match.turns[match.currentTurnIndex];
      applySoloDelivery(match, turn, {
        runsOffBat: 0,
        extraRuns: action.runs,
        extraType: "bye",
        isLegal: true,
        isWicket: false,
        dismissal: null,
        runsRanForStrike: 0,
        chargedToBowler: 0,
        countsBatsmanBall: true,
        label: `${action.runs}B`,
      });
      return commit(state, concludeSoloTransition(match));
    }

    case "SOLO_LEGBYE": {
      if (!canScoreSolo(state.match)) return state;
      const match = clone(state.match);
      const turn = match.turns[match.currentTurnIndex];
      applySoloDelivery(match, turn, {
        runsOffBat: 0,
        extraRuns: action.runs,
        extraType: "legbye",
        isLegal: true,
        isWicket: false,
        dismissal: null,
        runsRanForStrike: 0,
        chargedToBowler: 0,
        countsBatsmanBall: true,
        label: `${action.runs}Lb`,
      });
      return commit(state, concludeSoloTransition(match));
    }

    case "SOLO_WICKET": {
      if (!canScoreSolo(state.match)) return state;
      const match = clone(state.match);
      const turn = match.turns[match.currentTurnIndex];
      const dismissal: Dismissal = {
        type: "bowled",
        batsmanId: turn.batterId,
        bowlerId: turn.bowlerId ?? undefined,
      };
      applySoloDelivery(match, turn, {
        runsOffBat: 0,
        extraRuns: 0,
        extraType: null,
        isLegal: true,
        isWicket: true,
        dismissal,
        runsRanForStrike: 0,
        chargedToBowler: 0,
        countsBatsmanBall: true,
        label: "W",
      });
      return commit(state, concludeSoloTransition(match));
    }

    case "SOLO_NEW_BOWLER": {
      if (!state.match || state.match.mode !== "solo") return state;
      const match = clone(state.match);
      const turn = match.turns[match.currentTurnIndex];
      if (!turn || turn.batterId === action.bowlerId) return state;
      turn.bowlerId = action.bowlerId;
      return commit(state, match);
    }

    case "SOLO_END_TURN": {
      if (!state.match || state.match.mode !== "solo") return state;
      const match = clone(state.match);
      const turn = match.turns[match.currentTurnIndex];
      if (!turn || turn.isComplete) return state;
      turn.isComplete = true;
      turn.endReason = "manual";
      match.suggestedBowlerId = null;
      return commit(state, concludeSoloTransition(match));
    }

    case "SET_TOSS": {
      if (!state.match || state.match.mode !== "team") return state;
      const match = clone(state.match);
      match.toss = {
        callerTeamId: action.callerTeamId,
        call: action.call,
        result: action.result,
        winnerTeamId: action.winnerTeamId,
        decision: action.decision,
      };
      const battingTeamId =
        action.decision === "bat"
          ? action.winnerTeamId
          : match.teamA.id === action.winnerTeamId
            ? match.teamB.id
            : match.teamA.id;
      const bowlingTeamId =
        battingTeamId === match.teamA.id ? match.teamB.id : match.teamA.id;
      match.innings = [createInnings(0, battingTeamId, bowlingTeamId)];
      match.currentInningsIndex = 0;
      match.status = "select_players";
      return commitFresh(match);
    }

    case "START_INNINGS": {
      if (!state.match || state.match.mode !== "team") return state;
      const match = clone(state.match);
      const inn = match.innings[match.currentInningsIndex];
      if (!inn) return state;
      ensureBatsman(inn, action.strikerId, 1).status = "not_out";
      ensureBatsman(inn, action.nonStrikerId, 2).status = "not_out";
      inn.strikerId = action.strikerId;
      inn.nonStrikerId = action.nonStrikerId;
      const bw = ensureBowler(inn, action.bowlerId);
      bw.runsThisOver = 0;
      bw.legalBallsThisOver = 0;
      inn.currentBowlerId = action.bowlerId;
      inn.previousBowlerId = null;
      inn.partnership = {
        batsman1Id: action.strikerId,
        batsman2Id: action.nonStrikerId,
        runs: 0,
        balls: 0,
      };
      match.status = "live";
      return commitFresh(match);
    }

    case "SCORE_RUNS": {
      if (!canScore(state.match)) return state;
      const match = clone(state.match);
      const inn = match.innings[match.currentInningsIndex];
      applyDelivery(match, inn, {
        runsOffBat: action.runs,
        extraRuns: 0,
        extraType: null,
        isLegal: true,
        isWicket: false,
        dismissal: null,
        runsRanForStrike: action.runs,
        chargedToBowler: action.runs,
        countsBatsmanBall: true,
        label: String(action.runs),
      });
      return commit(state, concludeTransition(match));
    }

    case "WIDE": {
      if (!canScore(state.match)) return state;
      const match = clone(state.match);
      const inn = match.innings[match.currentInningsIndex];
      const total = 1 + action.additionalRuns;
      applyDelivery(match, inn, {
        runsOffBat: 0,
        extraRuns: total,
        extraType: "wide",
        isLegal: false,
        isWicket: false,
        dismissal: null,
        runsRanForStrike: action.additionalRuns,
        chargedToBowler: total,
        countsBatsmanBall: false,
        label: total === 1 ? "Wd" : `${total}Wd`,
      });
      return commit(state, concludeTransition(match));
    }

    case "NOBALL": {
      if (!canScore(state.match)) return state;
      const match = clone(state.match);
      const inn = match.innings[match.currentInningsIndex];
      applyDelivery(match, inn, {
        runsOffBat: action.runsOffBat,
        extraRuns: 1,
        extraType: "noball",
        isLegal: false,
        isWicket: false,
        dismissal: null,
        runsRanForStrike: action.runsOffBat,
        chargedToBowler: 1 + action.runsOffBat,
        countsBatsmanBall: true,
        label: action.runsOffBat === 0 ? "Nb" : `Nb${action.runsOffBat}`,
      });
      return commit(state, concludeTransition(match));
    }

    case "BYE": {
      if (!canScore(state.match)) return state;
      const match = clone(state.match);
      const inn = match.innings[match.currentInningsIndex];
      applyDelivery(match, inn, {
        runsOffBat: 0,
        extraRuns: action.runs,
        extraType: "bye",
        isLegal: true,
        isWicket: false,
        dismissal: null,
        runsRanForStrike: action.runs,
        chargedToBowler: 0,
        countsBatsmanBall: true,
        label: `${action.runs}B`,
      });
      return commit(state, concludeTransition(match));
    }

    case "LEGBYE": {
      if (!canScore(state.match)) return state;
      const match = clone(state.match);
      const inn = match.innings[match.currentInningsIndex];
      applyDelivery(match, inn, {
        runsOffBat: 0,
        extraRuns: action.runs,
        extraType: "legbye",
        isLegal: true,
        isWicket: false,
        dismissal: null,
        runsRanForStrike: action.runs,
        chargedToBowler: 0,
        countsBatsmanBall: true,
        label: `${action.runs}Lb`,
      });
      return commit(state, concludeTransition(match));
    }

    case "WICKET": {
      if (!canScore(state.match)) return state;
      // Retired hurt is not a delivery — handle separately.
      if (action.dismissalType === "retired_hurt") {
        const match = clone(state.match);
        retireStriker(match);
        return commit(state, match);
      }
      const match = clone(state.match);
      const inn = match.innings[match.currentInningsIndex];
      const isRunOut = action.dismissalType === "run_out";
      const runsOffBat = isRunOut ? (action.runsCompleted ?? 0) : 0;
      const outId = action.outBatsmanId ?? (inn.strikerId as string);
      const credited = BOWLER_CREDITED_DISMISSALS.includes(action.dismissalType);
      const dismissal: Dismissal = {
        type: action.dismissalType,
        batsmanId: outId,
        bowlerId: credited ? (inn.currentBowlerId ?? undefined) : undefined,
      };
      applyDelivery(match, inn, {
        runsOffBat,
        extraRuns: 0,
        extraType: null,
        isLegal: true,
        isWicket: true,
        dismissal,
        runsRanForStrike: runsOffBat,
        chargedToBowler: runsOffBat,
        countsBatsmanBall: true,
        label: runsOffBat > 0 ? `${runsOffBat}+W` : "W",
      });
      return commit(state, concludeTransition(match));
    }

    case "RETIRE_HURT": {
      if (!canScore(state.match)) return state;
      const match = clone(state.match);
      retireStriker(match);
      return commit(state, match);
    }

    case "NEW_BATSMAN": {
      if (!state.match || state.match.mode !== "team") return state;
      const match = clone(state.match);
      const inn = match.innings[match.currentInningsIndex];
      if (!inn) return state;
      const rec = ensureBatsman(inn, action.playerId, nextBattingOrder(inn));
      if (rec.status === "did_not_bat") {
        rec.status = "not_out";
        if (rec.battingOrder === 0) rec.battingOrder = nextBattingOrder(inn);
      } else if (rec.status === "retired") {
        rec.status = "not_out"; // resuming after a retirement
      }
      if (inn.strikerId === null) inn.strikerId = action.playerId;
      else if (inn.nonStrikerId === null) inn.nonStrikerId = action.playerId;
      if (inn.strikerId && inn.nonStrikerId) {
        inn.partnership = {
          batsman1Id: inn.strikerId,
          batsman2Id: inn.nonStrikerId,
          runs: 0,
          balls: 0,
        };
      }
      // Continuation of a wicket/retirement — no separate undo step.
      return commitContinue(state, match);
    }

    case "NEW_BOWLER": {
      if (!state.match || state.match.mode !== "team") return state;
      const match = clone(state.match);
      const inn = match.innings[match.currentInningsIndex];
      if (!inn) return state;
      const wasManual = inn.currentBowlerId !== null;
      const bw = ensureBowler(inn, action.bowlerId);
      bw.runsThisOver = 0;
      bw.legalBallsThisOver = 0;
      inn.currentBowlerId = action.bowlerId;
      // A manual mid-spell change is undoable; filling a required slot is a
      // continuation that preserves the prior delivery's undo step.
      return wasManual ? commit(state, match) : commitContinue(state, match);
    }

    case "END_INNINGS": {
      if (!state.match || state.match.mode !== "team") return state;
      const inn = state.match.innings[state.match.currentInningsIndex];
      if (!inn || inn.isComplete || state.match.status !== "live") return state;
      const match = clone(state.match);
      const current = match.innings[match.currentInningsIndex];
      current.isComplete = true;
      current.endReason = "declared";
      return commit(state, concludeTransition(match));
    }

    case "END_MATCH": {
      if (!state.match || state.match.mode !== "team") return state;
      if (state.match.status !== "live" && state.match.status !== "innings_break") {
        return state;
      }
      const match = clone(state.match);
      const inn = match.innings[match.currentInningsIndex];
      if (inn && !inn.isComplete) {
        inn.isComplete = true;
        inn.endReason = "declared";
      }
      // A second innings exists once the chase has begun (or at the break);
      // otherwise the match is being abandoned during the first innings.
      if (match.innings.length > 1 && match.innings[1]) {
        match.result = computeResult(match);
      } else {
        match.result = {
          winnerTeamId: null,
          isTie: false,
          margin: 0,
          marginType: null,
          summary: "Match ended — no result",
        };
      }
      match.status = "complete";
      return commit(state, match);
    }

    case "UNDO": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return { match: prev, past: state.past.slice(0, -1) };
    }

    default:
      return state;
  }
}
