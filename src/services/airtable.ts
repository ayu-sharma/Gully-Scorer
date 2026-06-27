/**
 * Airtable REST API client.
 *
 * The whole module is **optional**: if no credentials are present every call
 * resolves to a no-op so the app is fully usable offline / unconfigured. Drop
 * `NEXT_PUBLIC_AIRTABLE_API_KEY` and `NEXT_PUBLIC_AIRTABLE_BASE_ID` into
 * `.env.local` (see `.env.local.example`) to turn syncing on — no code change.
 */

import type {
  BallEvent,
  Innings,
  MatchState,
  Player,
  SyncTable,
  Team,
} from "@/types";
import { oversDisplay } from "@/utils/format";

const API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY ?? "";
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID ?? "";

const TABLES: Record<SyncTable, string> = {
  Teams: process.env.NEXT_PUBLIC_AIRTABLE_TEAMS_TABLE ?? "Teams",
  Players: process.env.NEXT_PUBLIC_AIRTABLE_PLAYERS_TABLE ?? "Players",
  Matches: process.env.NEXT_PUBLIC_AIRTABLE_MATCHES_TABLE ?? "Matches",
  BallByBall: process.env.NEXT_PUBLIC_AIRTABLE_BALLS_TABLE ?? "BallByBall",
};

/** True when both credentials are present. */
export function airtableConfigured(): boolean {
  return Boolean(API_KEY && BASE_ID);
}

function endpoint(table: SyncTable, recordId?: string): string {
  const base = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLES[table])}`;
  return recordId ? `${base}/${recordId}` : base;
}

export class AirtableError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AirtableError";
  }
}

/**
 * Create a single record and return its Airtable id.
 * Throws (so the sync queue can retry) on any network / API failure.
 */
export async function createRecord(
  table: SyncTable,
  fields: Record<string, unknown>,
): Promise<string> {
  if (!airtableConfigured()) {
    throw new AirtableError("Airtable not configured");
  }
  const res = await fetch(endpoint(table), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) {
    throw new AirtableError(`Airtable POST ${table} failed`, res.status);
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

/** Update an existing record. */
export async function updateRecord(
  table: SyncTable,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  if (!airtableConfigured()) {
    throw new AirtableError("Airtable not configured");
  }
  const res = await fetch(endpoint(table, recordId), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) {
    throw new AirtableError(`Airtable PATCH ${table} failed`, res.status);
  }
}

// ── Field builders ────────────────────────────────────────────────────────────
// Each row also carries a JSON `Payload` so no data is lost if a column is
// renamed or missing in the user's base.

export function teamFields(match: MatchState, team: Team): Record<string, unknown> {
  return {
    Name: team.name,
    MatchId: match.id,
    Payload: JSON.stringify(team),
  };
}

export function playerFields(
  match: MatchState,
  team: Team,
  player: Player,
): Record<string, unknown> {
  return {
    Name: player.name,
    Team: team.name,
    MatchId: match.id,
    Payload: JSON.stringify(player),
  };
}

export function matchFields(match: MatchState): Record<string, unknown> {
  return {
    MatchId: match.id,
    TeamA: match.teamA.name,
    TeamB: match.teamB.name,
    Overs: match.oversPerInnings,
    Status: match.status,
    Result: match.result?.summary ?? "",
    Summary: match.result?.summary ?? "",
    Payload: JSON.stringify(match),
  };
}

export function ballFields(match: MatchState, innings: Innings, ball: BallEvent): Record<string, unknown> {
  const strikerName = match.teamA.players
    .concat(match.teamB.players)
    .find((p) => p.id === ball.strikerId)?.name;
  const bowlerName = match.teamA.players
    .concat(match.teamB.players)
    .find((p) => p.id === ball.bowlerId)?.name;
  return {
    MatchId: match.id,
    Innings: innings.index + 1,
    Over: oversDisplay(innings.legalBalls),
    Label: ball.label,
    Runs: ball.totalRuns,
    Extra: ball.extraType ?? "",
    Wicket: ball.isWicket,
    Striker: strikerName ?? ball.strikerId,
    Bowler: bowlerName ?? ball.bowlerId,
    Payload: JSON.stringify(ball),
  };
}
