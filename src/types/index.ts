/**
 * Domain model for the entire cricket scoring app.
 *
 * The model is intentionally flat and JSON-serialisable so the whole match can
 * be persisted to LocalStorage / Airtable and snapshotted for undo with a
 * simple structured clone.
 */

// ────────────────────────────────────────────────────────────────────────────
// Teams & players
// ────────────────────────────────────────────────────────────────────────────

export interface Player {
  /** Stable client-side id. */
  id: string;
  name: string;
  /** Airtable record id once synced. */
  airtableId?: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  airtableId?: string;
}

/** Which side of the match a team is on, independent of A/B labelling. */
export type TeamSlot = "A" | "B";

// ────────────────────────────────────────────────────────────────────────────
// Toss
// ────────────────────────────────────────────────────────────────────────────

export type TossCall = "heads" | "tails";
export type TossDecision = "bat" | "bowl";

export interface Toss {
  /** Team that made the heads/tails call. */
  callerTeamId: string;
  call: TossCall;
  /** The actual (random) coin result. */
  result: TossCall;
  /** Team that won the toss (caller if call === result, else the other team). */
  winnerTeamId: string;
  /** What the winner elected to do. */
  decision: TossDecision;
}

// ────────────────────────────────────────────────────────────────────────────
// Deliveries
// ────────────────────────────────────────────────────────────────────────────

export type ExtraType = "wide" | "noball" | "bye" | "legbye";

export type DismissalType =
  | "bowled"
  | "caught"
  | "lbw"
  | "run_out"
  | "stumped"
  | "hit_wicket"
  | "retired_hurt";

export interface Dismissal {
  type: DismissalType;
  /** The batsman who is out. */
  batsmanId: string;
  /** Credited bowler — absent for run-outs and retirements. */
  bowlerId?: string;
}

/**
 * A single recorded delivery (or extra). Stored append-only in the innings so
 * the ball history and "this over" strips can be rebuilt at any time.
 */
export interface BallEvent {
  id: string;
  inningsIndex: number;
  /** Zero-based over the delivery belongs to. */
  over: number;
  /** Legal-ball position within the over (1–6); 0 for an illegal delivery. */
  ballInOver: number;
  /** Compact label for the history strip, e.g. "4", "W", "Wd", "2Lb", "Nb1". */
  label: string;
  /** Runs scored off the bat (credited to the batsman). */
  runsOffBat: number;
  /** Extra runs (penalty + byes/legbyes etc.). */
  extraRuns: number;
  extraType: ExtraType | null;
  /** runsOffBat + extraRuns — what gets added to the team total. */
  totalRuns: number;
  /** Whether the delivery counts towards the over. */
  isLegal: boolean;
  isWicket: boolean;
  dismissal: Dismissal | null;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  timestamp: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Innings aggregates
// ────────────────────────────────────────────────────────────────────────────

export type BatStatus = "did_not_bat" | "not_out" | "out" | "retired";

export interface BatsmanInnings {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  status: BatStatus;
  dismissal: Dismissal | null;
  /** Order in which the player came to the crease (1-based). */
  battingOrder: number;
}

export interface BowlerInnings {
  playerId: string;
  /** Legal balls bowled. */
  balls: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
  /** Whether the bowler is currently mid-over (used for the maiden check). */
  runsThisOver: number;
  legalBallsThisOver: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  /** Team runs at the moment the wicket fell. */
  runs: number;
  /** Overs display when it fell, e.g. "5.3". */
  over: string;
  batsmanId: string;
  batsmanName: string;
}

export interface Partnership {
  batsman1Id: string;
  batsman2Id: string;
  runs: number;
  balls: number;
}

export interface Extras {
  wides: number;
  noballs: number;
  byes: number;
  legbyes: number;
  total: number;
}

export interface Innings {
  index: number;
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  /** Total legal balls bowled in the innings. */
  legalBalls: number;
  extras: Extras;
  batsmen: BatsmanInnings[];
  bowlers: BowlerInnings[];
  balls: BallEvent[];
  fallOfWickets: FallOfWicket[];
  partnership: Partnership;
  strikerId: string | null;
  nonStrikerId: string | null;
  currentBowlerId: string | null;
  /** Bowler of the previous over — cannot bowl the next one. */
  previousBowlerId: string | null;
  isComplete: boolean;
  /** How the innings ended, for the summary. */
  endReason: "all_out" | "overs" | "target" | "declared" | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Match
// ────────────────────────────────────────────────────────────────────────────

export type MatchStatus =
  | "setup"
  | "toss"
  | "select_players"
  | "live"
  | "innings_break"
  | "complete";

export interface MatchResult {
  /** Winning team id, or null for a tie. */
  winnerTeamId: string | null;
  isTie: boolean;
  margin: number;
  marginType: "runs" | "wickets" | null;
  /** Human-readable summary, e.g. "India won by 6 wickets". */
  summary: string;
}

export interface MatchState {
  id: string;
  createdAt: number;
  updatedAt: number;
  teamA: Team;
  teamB: Team;
  oversPerInnings: number;
  /** Squad size per side (11). The innings auto-ends after playersPerSide - 1 wickets. */
  playersPerSide: number;
  toss: Toss | null;
  innings: Innings[];
  currentInningsIndex: number;
  status: MatchStatus;
  /** Runs the chasing side needs (innings[0].runs + 1) once the break is hit. */
  target: number | null;
  result: MatchResult | null;
  airtableMatchId?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Sync queue (offline-first Airtable writes)
// ────────────────────────────────────────────────────────────────────────────

export type SyncTable = "Teams" | "Players" | "Matches" | "BallByBall";

export interface SyncJob {
  id: string;
  table: SyncTable;
  /** Airtable `fields` payload. */
  fields: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}
