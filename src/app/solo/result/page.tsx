"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants";
import { useMatch } from "@/hooks/useMatch";
import type { SoloMatch, SoloTurn } from "@/types";
import { oversDisplay } from "@/utils/format";

function playerName(match: SoloMatch, id: string): string {
  return match.players.find((p) => p.id === id)?.name ?? "—";
}

function rankedTurns(match: SoloMatch): SoloTurn[] {
  return [...match.turns].sort((a, b) => b.runs - a.runs || a.wickets - b.wickets || a.index - b.index);
}

export default function SoloResultPage() {
  const router = useRouter();
  const { match, hydrated, newMatch } = useMatch();

  useEffect(() => {
    if (!hydrated) return;
    if (!match) router.replace(ROUTES.soloSetup);
    else if (match.mode !== "solo") router.replace(ROUTES.result);
    else if (match.status !== "complete") router.replace(ROUTES.soloScore);
  }, [hydrated, match, router]);

  const solo = match?.mode === "solo" ? match : null;

  if (!hydrated || !solo || !solo.result) {
    return (
      <Screen className="min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </Screen>
    );
  }

  const ranking = rankedTurns(solo);

  return (
    <Screen className="min-h-dvh justify-between pb-[calc(var(--safe-bottom)+1.5rem)] pt-[calc(var(--safe-top)+2rem)]">
      <div className="flex flex-1 flex-col justify-center">
        <div className="text-center">
          <p className="text-6xl">{solo.result.isTie ? "🤝" : "🏆"}</p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
            Solo Gully Result
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{solo.result.summary}</h1>
        </div>

        <div className="card mt-8 overflow-hidden p-0">
          <div className="grid grid-cols-[2.5rem_1fr_5rem_4rem] gap-2 bg-white/[0.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <span>#</span>
            <span>Player</span>
            <span className="text-right">Score</span>
            <span className="text-right">Overs</span>
          </div>
          <div className="divide-y divide-white/5">
            {ranking.map((turn, i) => {
              const isWinner = solo.result?.winnerPlayerId === turn.batterId;
              return (
                <div
                  key={turn.batterId}
                  className={`grid grid-cols-[2.5rem_1fr_5rem_4rem] items-center gap-2 px-4 py-3 ${
                    isWinner ? "bg-brand-500/10" : ""
                  }`}
                >
                  <span className="tnum text-sm font-black text-white/50">{i + 1}</span>
                  <span className="truncate text-sm font-bold">
                    {isWinner && <span className="mr-1">🏆</span>}
                    {playerName(solo, turn.batterId)}
                  </span>
                  <span className="tnum text-right text-base font-black">
                    {turn.runs}/{turn.wickets}
                  </span>
                  <span className="tnum text-right text-sm text-white/55">
                    {oversDisplay(turn.legalBalls)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-2.5">
        <Button size="xl" fullWidth onClick={() => router.push(ROUTES.soloScore)}>
          View scoring
        </Button>
        <Button
          size="lg"
          variant="secondary"
          fullWidth
          onClick={() => {
            newMatch();
            router.push(ROUTES.home);
          }}
        >
          New match
        </Button>
      </div>
    </Screen>
  );
}
