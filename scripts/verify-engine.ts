/**
 * Headless verification of the scoring engine (the pure reducer).
 * Drives realistic match scenarios and asserts cricket correctness.
 *
 * This is a dev-only regression tool — excluded from the app build (see
 * tsconfig "exclude"). Run it with:
 *
 *   npx esbuild scripts/verify-engine.ts --bundle --platform=node \
 *     --format=esm --outfile=/tmp/engine.test.mjs --tsconfig=./tsconfig.json \
 *     && node /tmp/engine.test.mjs
 */
import { reducer, initialState, type AppState, type Action } from "@/context/reducer";
import { computeResult, currentInnings } from "@/utils/cricket";
import type { MatchState } from "@/types";

let passed = 0;
let failed = 0;
function check(label: string, cond: boolean) {
  if (cond) {
    passed++;
    // console.log("  ✓", label);
  } else {
    failed++;
    console.log("  ✗ FAIL:", label);
  }
}

function names(prefix: string) {
  return Array.from({ length: 11 }, (_, i) => `${prefix}${i + 1}`);
}

class Engine {
  state: AppState = initialState;
  d(action: Action) {
    this.state = reducer(this.state, action);
  }
  get m(): MatchState {
    if (!this.state.match) throw new Error("no match");
    return this.state.match;
  }
  get inn() {
    return currentInnings(this.m)!;
  }
}

// ── Scenario 1: full first-innings mechanics ───────────────────────────────
function scenario1() {
  console.log("Scenario 1 — first innings mechanics, undo, transition");
  const e = new Engine();
  e.d({ type: "INIT_MATCH", teamAName: "Tigers", teamBName: "Lions", teamAPlayers: names("A"), teamBPlayers: names("B"), overs: 2, playersPerSide: 11 });
  const A = e.m.teamA.players.map((p) => p.id);
  const B = e.m.teamB.players.map((p) => p.id);
  e.d({ type: "SET_TOSS", callerTeamId: e.m.teamA.id, call: "heads", result: "heads", winnerTeamId: e.m.teamA.id, decision: "bat" });
  check("toss -> select_players", e.m.status === "select_players");
  check("innings[0] batting = teamA", e.inn.battingTeamId === e.m.teamA.id);

  e.d({ type: "START_INNINGS", strikerId: A[0], nonStrikerId: A[1], bowlerId: B[0] });
  check("status live", e.m.status === "live");
  check("striker is A1", e.inn.strikerId === A[0]);

  e.d({ type: "SCORE_RUNS", runs: 1 });
  check("1 run swaps strike to A2", e.inn.strikerId === A[1]);
  check("A1 has 1 run", e.inn.batsmen.find((b) => b.playerId === A[0])!.runs === 1);

  e.d({ type: "SCORE_RUNS", runs: 4 });
  check("4 does not swap (A2 on strike)", e.inn.strikerId === A[1]);
  check("A2 fours = 1", e.inn.batsmen.find((b) => b.playerId === A[1])!.fours === 1);

  e.d({ type: "WIDE", additionalRuns: 0 });
  check("wide adds 1 run (total 6)", e.inn.runs === 6);
  check("wide does not advance legal balls (still 2)", e.inn.legalBalls === 2);
  check("extras.wides = 1", e.inn.extras.wides === 1);

  e.d({ type: "SCORE_RUNS", runs: 2 }); // legal 3
  e.d({ type: "SCORE_RUNS", runs: 1 }); // legal 4, swap to A1
  check("after 1, strike back to A1", e.inn.strikerId === A[0]);
  e.d({ type: "SCORE_RUNS", runs: 0 }); // legal 5
  e.d({ type: "SCORE_RUNS", runs: 0 }); // legal 6 -> over ends

  check("over complete: 6 legal balls", e.inn.legalBalls === 6);
  check("end of over swaps strike to A2", e.inn.strikerId === A[1]);
  check("new bowler required", e.inn.currentBowlerId === null);
  check("previous bowler recorded = B1", e.inn.previousBowlerId === B[0]);
  check("runs total = 9", e.inn.runs === 9);
  const bowlerB1 = e.inn.bowlers.find((b) => b.playerId === B[0])!;
  check("B1 bowled 1 over (6 balls)", bowlerB1.balls === 6);
  check("B1 conceded 9", bowlerB1.runsConceded === 9);

  // Bowler can't repeat — pick B2.
  e.d({ type: "NEW_BOWLER", bowlerId: B[1] });
  check("new bowler B2 set", e.inn.currentBowlerId === B[1]);

  // Six then wicket.
  e.d({ type: "SCORE_RUNS", runs: 6 });
  check("six counted (runs 15)", e.inn.runs === 15);
  check("A2 sixes = 1", e.inn.batsmen.find((b) => b.playerId === A[1])!.sixes === 1);

  // Snapshot count before wicket for undo test.
  e.d({ type: "WICKET", dismissalType: "bowled" });
  check("wicket: 1 down", e.inn.wickets === 1);
  check("striker now empty (needs batsman)", e.inn.strikerId === null);
  check("B2 credited the wicket", e.inn.bowlers.find((b) => b.playerId === B[1])!.wickets === 1);
  check("A2 marked out", e.inn.batsmen.find((b) => b.playerId === A[1])!.status === "out");

  // UNDO the wicket — everything must restore.
  e.d({ type: "UNDO" });
  check("undo restores wickets to 0", e.inn.wickets === 0);
  check("undo restores striker A2", e.inn.strikerId === A[1]);
  check("undo clears bowler wicket", e.inn.bowlers.find((b) => b.playerId === B[1])!.wickets === 0);
  check("undo keeps runs at 15", e.inn.runs === 15);

  // Re-apply wicket and bring in A3.
  e.d({ type: "WICKET", dismissalType: "bowled" });
  e.d({ type: "NEW_BATSMAN", playerId: A[2] });
  check("A3 now on strike", e.inn.strikerId === A[2]);
  check("partnership reset", e.inn.partnership.runs === 0);

  // Finish the 2nd over (4 dot balls) -> 12 legal balls -> innings ends by overs.
  e.d({ type: "SCORE_RUNS", runs: 0 }); // legal 8
  e.d({ type: "SCORE_RUNS", runs: 0 }); // 9
  e.d({ type: "SCORE_RUNS", runs: 0 }); // 10
  e.d({ type: "SCORE_RUNS", runs: 0 }); // 11
  e.d({ type: "SCORE_RUNS", runs: 0 }); // 12 -> overs complete
  check("innings break reached", e.m.status === "innings_break");
  check("target = first innings + 1 (16)", e.m.target === 16);
  check("current innings index = 1", e.m.currentInningsIndex === 1);
}

// ── Scenario 2: chase wins by wickets ──────────────────────────────────────
function scenario2() {
  console.log("Scenario 2 — chase reaches target, win by wickets");
  const e = new Engine();
  e.d({ type: "INIT_MATCH", teamAName: "Tigers", teamBName: "Lions", teamAPlayers: names("A"), teamBPlayers: names("B"), overs: 2, playersPerSide: 11 });
  const A = e.m.teamA.players.map((p) => p.id);
  const B = e.m.teamB.players.map((p) => p.id);
  e.d({ type: "SET_TOSS", callerTeamId: e.m.teamA.id, call: "heads", result: "heads", winnerTeamId: e.m.teamA.id, decision: "bat" });
  e.d({ type: "START_INNINGS", strikerId: A[0], nonStrikerId: A[1], bowlerId: B[0] });
  // Tigers make 10 in 6 balls (boundary heavy), then declare/end.
  e.d({ type: "SCORE_RUNS", runs: 4 });
  e.d({ type: "SCORE_RUNS", runs: 6 });
  e.d({ type: "END_INNINGS" });
  check("target = 11", e.m.target === 11);
  check("innings break", e.m.status === "innings_break");

  e.d({ type: "START_INNINGS", strikerId: B[0], nonStrikerId: B[1], bowlerId: A[0] });
  e.d({ type: "SCORE_RUNS", runs: 6 });
  e.d({ type: "SCORE_RUNS", runs: 6 }); // 12 >= 11 -> win
  check("match complete", e.m.status === "complete");
  check("winner is Lions (teamB)", e.m.result!.winnerTeamId === e.m.teamB.id);
  check("margin type wickets", e.m.result!.marginType === "wickets");
  check("won by 10 wickets", e.m.result!.margin === 10);
}

// ── Scenario 3: defend wins by runs (overs exhausted) ──────────────────────
function scenario3() {
  console.log("Scenario 3 — chase falls short, win by runs");
  const e = new Engine();
  e.d({ type: "INIT_MATCH", teamAName: "Tigers", teamBName: "Lions", teamAPlayers: names("A"), teamBPlayers: names("B"), overs: 1, playersPerSide: 11 });
  const A = e.m.teamA.players.map((p) => p.id);
  const B = e.m.teamB.players.map((p) => p.id);
  e.d({ type: "SET_TOSS", callerTeamId: e.m.teamA.id, call: "heads", result: "tails", winnerTeamId: e.m.teamB.id, decision: "bowl" });
  // Toss won by B who bowls -> A bats first.
  check("teamA bats first (B chose bowl)", e.inn.battingTeamId === e.m.teamA.id);
  e.d({ type: "START_INNINGS", strikerId: A[0], nonStrikerId: A[1], bowlerId: B[0] });
  for (let i = 0; i < 6; i++) e.d({ type: "SCORE_RUNS", runs: 1 }); // 6 runs, over done
  check("first innings 6 runs", e.m.innings[0].runs === 6);
  check("auto innings break by overs", e.m.status === "innings_break");
  check("target 7", e.m.target === 7);

  e.d({ type: "START_INNINGS", strikerId: B[0], nonStrikerId: B[1], bowlerId: A[0] });
  e.d({ type: "SCORE_RUNS", runs: 1 });
  e.d({ type: "SCORE_RUNS", runs: 1 });
  e.d({ type: "SCORE_RUNS", runs: 1 });
  e.d({ type: "SCORE_RUNS", runs: 1 });
  e.d({ type: "SCORE_RUNS", runs: 1 });
  e.d({ type: "SCORE_RUNS", runs: 0 }); // 5 runs in 6 balls -> overs done, short by 1
  check("match complete", e.m.status === "complete");
  check("winner Tigers (teamA) defended", e.m.result!.winnerTeamId === e.m.teamA.id);
  check("won by runs", e.m.result!.marginType === "runs");
  check("margin 1 run", e.m.result!.margin === 1);

  // Direct tie check via computeResult.
  const tied = JSON.parse(JSON.stringify(e.m)) as MatchState;
  tied.innings[1].runs = 6;
  tied.target = 7;
  const r = computeResult(tied);
  check("equal scores => tie", r.isTie === true);
}

// ── Scenario 4: no-ball + leg-bye + run-out strike & counts ────────────────
function scenario4() {
  console.log("Scenario 4 — no-ball, leg-bye, run out");
  const e = new Engine();
  e.d({ type: "INIT_MATCH", teamAName: "Tigers", teamBName: "Lions", teamAPlayers: names("A"), teamBPlayers: names("B"), overs: 5, playersPerSide: 11 });
  const A = e.m.teamA.players.map((p) => p.id);
  const B = e.m.teamB.players.map((p) => p.id);
  e.d({ type: "SET_TOSS", callerTeamId: e.m.teamA.id, call: "heads", result: "heads", winnerTeamId: e.m.teamA.id, decision: "bat" });
  e.d({ type: "START_INNINGS", strikerId: A[0], nonStrikerId: A[1], bowlerId: B[0] });

  e.d({ type: "NOBALL", runsOffBat: 4 });
  check("no-ball: +1 penalty +4 bat = 5 runs", e.inn.runs === 5);
  check("no-ball not a legal ball", e.inn.legalBalls === 0);
  check("extras.noballs = 1 (penalty only)", e.inn.extras.noballs === 1);
  check("A1 credited 4 off bat", e.inn.batsmen.find((b) => b.playerId === A[0])!.runs === 4);
  check("A1 ball faced on no-ball", e.inn.batsmen.find((b) => b.playerId === A[0])!.balls === 1);

  e.d({ type: "LEGBYE", runs: 1 });
  check("leg-bye adds 1 (runs 6)", e.inn.runs === 6);
  check("leg-bye is a legal ball", e.inn.legalBalls === 1);
  check("leg-bye odd swaps strike to A2", e.inn.strikerId === A[1]);
  check("leg-bye not credited to batsman", e.inn.batsmen.find((b) => b.playerId === A[1])!.runs === 0);
  check("extras.legbyes = 1", e.inn.extras.legbyes === 1);

  // Run out the non-striker after 1 completed run.
  const strikerBefore = e.inn.strikerId!; // A2
  e.d({ type: "WICKET", dismissalType: "run_out", outBatsmanId: A[0], runsCompleted: 1 });
  check("run out: wickets = 1", e.inn.wickets === 1);
  check("run out adds 1 run (runs 7)", e.inn.runs === 7);
  check("run out: A1 marked out", e.inn.batsmen.find((b) => b.playerId === A[0])!.status === "out");
  check("run out gives bowler no wicket", e.inn.bowlers.find((b) => b.playerId === B[0])!.wickets === 0);
  // strikerBefore (A2) hit the run, 1 run => strike swapped to A1, but A1 is out => striker null.
  check("striker vacated for new batsman", e.inn.strikerId === null || e.inn.nonStrikerId === null);
  void strikerBefore;
}

console.log("── Scoring engine verification ──");
scenario1();
scenario2();
scenario3();
scenario4();
console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
