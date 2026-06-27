"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PlayersPanel } from "@/components/scoring/PlayersPanel";
import { Scoreboard } from "@/components/scoring/Scoreboard";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import type { MatchState } from "@/types";
import { currentInnings, getTeamById } from "@/utils/cricket";

const POLL_MS = 4000;

function LiveDot({ stale }: { stale: boolean }) {
  if (stale) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-white/40">
        <span className="h-2 w-2 rounded-full bg-white/20" />
        Reconnecting…
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
      </span>
      LIVE
    </span>
  );
}

function ViewContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("id");

  const [match, setMatch] = useState<MatchState | null>(null);
  const [ready, setReady] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!matchId) {
      setReady(true);
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/match?id=${matchId}`);
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as MatchState | null;
        if (cancelled) return;
        setMatch(data);
        setReady(true);
        setStale(false);
      } catch {
        if (!cancelled) setStale(true);
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [matchId]);

  if (!matchId) {
    return (
      <Screen className="min-h-dvh items-center justify-center text-center">
        <div className="space-y-3">
          <p className="text-4xl">🔗</p>
          <p className="text-lg font-bold text-white/70">Invalid link</p>
          <p className="text-sm text-white/40">Ask the scorer to share their match link.</p>
        </div>
      </Screen>
    );
  }

  if (!ready) {
    return (
      <Screen className="min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </Screen>
    );
  }

  if (!match || match.status === "setup") {
    return (
      <Screen className="min-h-dvh items-center justify-center text-center">
        <div className="space-y-3">
          <p className="text-4xl">🏏</p>
          <p className="text-lg font-bold text-white/70">No match in progress</p>
          <p className="text-sm text-white/40">The scorer hasn&apos;t started yet. Check back soon.</p>
          <LiveDot stale={stale} />
        </div>
      </Screen>
    );
  }

  if (match.status === "toss" || match.status === "select_players") {
    return (
      <Screen className="min-h-dvh items-center justify-center text-center">
        <div className="space-y-3">
          <p className="text-4xl">🪙</p>
          <p className="text-lg font-bold text-white/70">
            {match.teamA.name} vs {match.teamB.name}
          </p>
          <p className="text-sm text-white/40">
            {match.status === "toss" ? "Toss in progress…" : "Players being selected…"}
          </p>
          <LiveDot stale={stale} />
        </div>
      </Screen>
    );
  }

  if (match.status === "innings_break") {
    const first = match.innings[0];
    const firstTeam = getTeamById(match, first.battingTeamId);
    const chasingTeam = getTeamById(match, first.bowlingTeamId);
    return (
      <Screen className="min-h-dvh items-center justify-center text-center">
        <div className="w-full space-y-5">
          <div className="flex justify-center">
            <LiveDot stale={stale} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
            Innings Break
          </p>
          <div className="card p-6">
            <p className="text-lg font-bold text-white/70">{firstTeam.name}</p>
            <p className="tnum text-5xl font-black">
              {first.runs}/{first.wickets}
            </p>
            <p className="mt-3 text-base text-white/60">
              {chasingTeam.name} need{" "}
              <span className="font-extrabold text-accent-400">{match.target}</span> to win
            </p>
          </div>
        </div>
      </Screen>
    );
  }

  if (match.status === "complete" && match.result) {
    return (
      <Screen className="min-h-dvh items-center justify-center text-center">
        <div className="w-full space-y-5">
          <p className="text-4xl">🏆</p>
          <div className="card p-6 space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
              Final Result
            </p>
            <p className="text-xl font-black">{match.result.summary}</p>
          </div>
          {match.innings.map((inn) => {
            const team = getTeamById(match, inn.battingTeamId);
            return (
              <div key={inn.index} className="card p-4">
                <p className="text-sm font-bold text-white/60">{team.name}</p>
                <p className="tnum text-3xl font-black">
                  {inn.runs}/{inn.wickets}
                </p>
              </div>
            );
          })}
        </div>
      </Screen>
    );
  }

  const innings = currentInnings(match);
  if (!innings) {
    return (
      <Screen className="min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </Screen>
    );
  }

  const battingTeam = getTeamById(match, innings.battingTeamId);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 pt-[calc(var(--safe-top)+0.75rem)]">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold leading-tight">{battingTeam.name}</p>
          <p className="text-[11px] text-white/45">
            Innings {innings.index + 1} · {match.teamA.name} vs {match.teamB.name}
          </p>
        </div>
        <LiveDot stale={stale} />
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2.5 overflow-y-auto no-scrollbar px-4 py-2.5">
        <Scoreboard match={match} innings={innings} />
        <PlayersPanel match={match} innings={innings} />
        <p className="text-center text-[11px] text-white/25 pb-4">
          View-only · Updates every few seconds
        </p>
      </div>
    </div>
  );
}

export default function ViewPage() {
  return (
    <Suspense
      fallback={
        <Screen className="min-h-dvh items-center justify-center">
          <Spinner size={28} />
        </Screen>
      }
    >
      <ViewContent />
    </Suspense>
  );
}
