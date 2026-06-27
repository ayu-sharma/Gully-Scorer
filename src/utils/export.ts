/**
 * Match export helpers — used in "local only" mode (no Airtable) so the scorer
 * can still download their data as a spreadsheet-friendly CSV or a JSON backup.
 *
 * Pure string builders + a small browser download helper.
 */

import type { BatsmanInnings, Innings, MatchState } from "@/types";
import {
  battingCard,
  bowlingCard,
  getTeamById,
  playerName,
} from "@/utils/cricket";
import { economy, oversDisplay, strikeRate } from "@/utils/format";

type Cell = string | number | boolean | null | undefined;

function csvCell(value: Cell): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(rows: Cell[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function safeFilename(part: string): string {
  return part.replace(/[^\w\d-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "match";
}

function dismissalLine(match: MatchState, bat: BatsmanInnings): string {
  if (bat.status === "not_out") return "not out";
  if (bat.status === "did_not_bat") return "did not bat";
  if (bat.status === "retired") return "retired hurt";
  const d = bat.dismissal;
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
    default:
      return "out";
  }
}

function inningsScorecardRows(match: MatchState, innings: Innings): Cell[][] {
  const team = getTeamById(match, innings.battingTeamId);
  const rows: Cell[][] = [];
  rows.push([`Innings ${innings.index + 1} — ${team.name}`]);
  rows.push(["Batter", "Dismissal", "R", "B", "4s", "6s", "SR"]);
  for (const bat of battingCard(innings).filter((b) => b.battingOrder > 0)) {
    rows.push([
      playerName(match, bat.playerId),
      dismissalLine(match, bat),
      bat.runs,
      bat.balls,
      bat.fours,
      bat.sixes,
      strikeRate(bat.runs, bat.balls),
    ]);
  }
  const e = innings.extras;
  rows.push(["Extras", `b ${e.byes}, lb ${e.legbyes}, w ${e.wides}, nb ${e.noballs}`, e.total]);
  rows.push(["Total", `${oversDisplay(innings.legalBalls)} ov`, innings.runs, "", "", "", `${innings.wickets} wkts`]);

  const didNotBat = team.players
    .filter((p) => !battingCard(innings).some((b) => b.battingOrder > 0 && b.playerId === p.id))
    .map((p) => p.name);
  if (didNotBat.length) rows.push(["Did not bat", didNotBat.join(", ")]);

  rows.push([]);
  rows.push(["Bowler", "O", "M", "R", "W", "Econ"]);
  for (const b of bowlingCard(innings)) {
    rows.push([
      playerName(match, b.playerId),
      oversDisplay(b.balls),
      b.maidens,
      b.runsConceded,
      b.wickets,
      economy(b.runsConceded, b.balls),
    ]);
  }

  if (innings.fallOfWickets.length) {
    rows.push([]);
    rows.push(["Fall of wickets"]);
    for (const f of innings.fallOfWickets) {
      rows.push([`${f.wicketNumber}-${f.runs}`, `${f.batsmanName} (${f.over} ov)`]);
    }
  }
  return rows;
}

/** Full scorecard for the match (both innings) as a single CSV. */
export function matchToScorecardCSV(match: MatchState): string {
  const rows: Cell[][] = [];
  rows.push(["Match", `${match.teamA.name} vs ${match.teamB.name}`]);
  rows.push(["Overs", match.oversPerInnings]);
  if (match.toss) {
    const tossWinner = getTeamById(match, match.toss.winnerTeamId).name;
    rows.push(["Toss", `${tossWinner} won, chose to ${match.toss.decision}`]);
  }
  rows.push(["Result", match.result?.summary ?? "In progress"]);
  rows.push([]);

  match.innings.forEach((inn, i) => {
    rows.push(...inningsScorecardRows(match, inn));
    if (i < match.innings.length - 1) {
      rows.push([]);
      rows.push([]);
    }
  });
  return toCSV(rows);
}

/** Every delivery of the match, with a running score, as a CSV. */
export function matchToBallByBallCSV(match: MatchState): string {
  const rows: Cell[][] = [
    ["Innings", "Over.Ball", "Delivery", "Striker", "Bowler", "Runs", "Extra", "Wicket", "Dismissal", "Score"],
  ];
  for (const inn of match.innings) {
    let runs = 0;
    let wkts = 0;
    for (const ball of inn.balls) {
      runs += ball.totalRuns;
      if (ball.isWicket) wkts += 1;
      const overBall = ball.isLegal ? `${ball.over}.${ball.ballInOver}` : `${ball.over}.+`;
      rows.push([
        inn.index + 1,
        overBall,
        ball.label,
        playerName(match, ball.strikerId),
        playerName(match, ball.bowlerId),
        ball.totalRuns,
        ball.extraType ?? "",
        ball.isWicket ? "W" : "",
        ball.dismissal?.type ?? "",
        `${runs}/${wkts}`,
      ]);
    }
  }
  return toCSV(rows);
}

/** Complete machine-readable backup of the match state. */
export function matchToJSON(match: MatchState): string {
  return JSON.stringify(match, null, 2);
}

export function matchFileBase(match: MatchState): string {
  return `${safeFilename(match.teamA.name)}-vs-${safeFilename(match.teamB.name)}`;
}

/** Trigger a client-side file download. */
export function downloadFile(filename: string, content: string, mime: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
