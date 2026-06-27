"use client";

/**
 * MatchProvider — the single source of truth for the live match.
 *
 * Responsibilities:
 *  • hold reducer state (match + undo stack)
 *  • hydrate from LocalStorage on mount
 *  • persist every change back to LocalStorage
 *  • push teams / players / each delivery / final result to Airtable (no-op
 *    when unconfigured; queued + retried when offline)
 *  • expose ergonomic, strongly-typed action helpers to the UI
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { initSync, sync } from "@/services/sync";
import { storage } from "@/services/storage";
import type { DismissalType, MatchState } from "@/types";
import { initialState, reducer, type Action } from "@/context/reducer";

export interface MatchContextValue {
  match: MatchState | null;
  /** True once the initial LocalStorage hydration has run. */
  hydrated: boolean;
  canUndo: boolean;

  initMatch: (input: {
    teamAName: string;
    teamBName: string;
    teamAPlayers: string[];
    teamBPlayers: string[];
    overs: number;
  }) => void;
  setToss: (input: {
    callerTeamId: string;
    call: "heads" | "tails";
    result: "heads" | "tails";
    winnerTeamId: string;
    decision: "bat" | "bowl";
  }) => void;
  startInnings: (input: { strikerId: string; nonStrikerId: string; bowlerId: string }) => void;

  scoreRuns: (runs: number) => void;
  wide: (additionalRuns: number) => void;
  noBall: (runsOffBat: number) => void;
  bye: (runs: number) => void;
  legBye: (runs: number) => void;
  wicket: (input: { dismissalType: DismissalType; outBatsmanId?: string; runsCompleted?: number }) => void;
  retireHurt: () => void;

  newBatsman: (playerId: string) => void;
  newBowler: (bowlerId: string) => void;

  endInnings: () => void;
  undo: () => void;
  newMatch: () => void;
}

export const MatchContext = createContext<MatchContextValue | null>(null);

export function MatchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  // Refs guard against double-syncing the same record (e.g. after a reload).
  const syncedBallIds = useRef<Set<string>>(new Set());
  const syncedTeamsForMatch = useRef<string | null>(null);
  const syncedCompleteForMatch = useRef<string | null>(null);

  // ── Hydrate once on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const saved = storage.loadMatch();
    if (saved) {
      // Treat everything already persisted as already-synced so resuming a
      // match never re-uploads the whole ball log.
      saved.innings.forEach((inn) => inn.balls.forEach((b) => syncedBallIds.current.add(b.id)));
      if (saved.status !== "setup") syncedTeamsForMatch.current = saved.id;
      if (saved.status === "complete") syncedCompleteForMatch.current = saved.id;
      dispatch({ type: "LOAD", match: saved });
    }
    const cleanup = initSync();
    setHydrated(true);
    return cleanup;
  }, []);

  // ── Push state to the live-viewer API (fire-and-forget) ────────────────────
  useEffect(() => {
    if (!hydrated || !state.match) return;
    fetch(`/api/match?id=${state.match.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.match),
    }).catch(() => {});
  }, [state.match, hydrated]);

  // ── Persist + sync on every change ─────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    const match = state.match;

    if (!match) {
      storage.clearMatch();
      return;
    }

    storage.saveMatch(match);

    // Teams, players and the initial match row — once, right after setup.
    if (match.status !== "setup" && syncedTeamsForMatch.current !== match.id) {
      syncedTeamsForMatch.current = match.id;
      sync.teamsAndPlayers(match);
      sync.match(match);
    }

    // Every new delivery.
    for (const inn of match.innings) {
      for (const ball of inn.balls) {
        if (!syncedBallIds.current.has(ball.id)) {
          syncedBallIds.current.add(ball.id);
          sync.ball(match, inn, ball);
        }
      }
    }

    // Final match row with the result.
    if (match.status === "complete" && syncedCompleteForMatch.current !== match.id) {
      syncedCompleteForMatch.current = match.id;
      sync.match(match);
    }
  }, [state.match, hydrated]);

  // ── Action helpers ─────────────────────────────────────────────────────────
  const run = useCallback((action: Action) => dispatch(action), []);

  const value = useMemo<MatchContextValue>(
    () => ({
      match: state.match,
      hydrated,
      canUndo: state.past.length > 0,

      initMatch: (input) => run({ type: "INIT_MATCH", ...input }),
      setToss: (input) => run({ type: "SET_TOSS", ...input }),
      startInnings: (input) => run({ type: "START_INNINGS", ...input }),

      scoreRuns: (runs) => run({ type: "SCORE_RUNS", runs }),
      wide: (additionalRuns) => run({ type: "WIDE", additionalRuns }),
      noBall: (runsOffBat) => run({ type: "NOBALL", runsOffBat }),
      bye: (runs) => run({ type: "BYE", runs }),
      legBye: (runs) => run({ type: "LEGBYE", runs }),
      wicket: (input) => run({ type: "WICKET", ...input }),
      retireHurt: () => run({ type: "RETIRE_HURT" }),

      newBatsman: (playerId) => run({ type: "NEW_BATSMAN", playerId }),
      newBowler: (bowlerId) => run({ type: "NEW_BOWLER", bowlerId }),

      endInnings: () => run({ type: "END_INNINGS" }),
      undo: () => run({ type: "UNDO" }),
      newMatch: () => run({ type: "NEW_MATCH" }),
    }),
    [state.match, state.past.length, hydrated, run],
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}
