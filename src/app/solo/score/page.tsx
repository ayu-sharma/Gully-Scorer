"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BallHistory } from "@/components/scoring/BallHistory";
import { RunChoiceSheet } from "@/components/scoring/RunChoiceSheet";
import { ScoringPad } from "@/components/scoring/ScoringPad";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { PlayerPicker } from "@/components/ui/PlayerPicker";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { BYE_RUN_OPTIONS, NOBALL_RUN_OPTIONS, ROUTES, WIDE_RUN_OPTIONS } from "@/constants";
import { useHaptics } from "@/hooks/useHaptics";
import { useMatch } from "@/hooks/useMatch";
import { useToast } from "@/hooks/useToast";
import type { SoloMatch, SoloPlayer, SoloTurn } from "@/types";
import { oversDisplay } from "@/utils/format";

type SheetType = "wide" | "noball" | "bye" | "legbye" | "changeBowler" | "endTurn" | null;

function soloPlayerName(match: SoloMatch, playerId: string | null | undefined): string {
  if (!playerId) return "—";
  return match.players.find((p) => p.id === playerId)?.name ?? "—";
}

function ballsPerTurn(match: SoloMatch): number | null {
  return match.oversPerPlayer == null ? null : match.oversPerPlayer * 6;
}

function turnLengthLabel(match: SoloMatch): string {
  return match.oversPerPlayer == null
    ? "till out"
    : `${match.oversPerPlayer} over${match.oversPerPlayer === 1 ? "" : "s"}`;
}

function sortedTurns(match: SoloMatch): SoloTurn[] {
  return [...match.turns].sort((a, b) => b.runs - a.runs || a.wickets - b.wickets || a.index - b.index);
}

function availableBowlers(match: SoloMatch, turn: SoloTurn): SoloPlayer[] {
  return match.players.filter((p) => p.id !== turn.batterId);
}

export default function SoloScorePage() {
  const router = useRouter();
  const {
    match,
    hydrated,
    canUndo,
    undo,
    startSoloTurn,
    soloScoreRuns,
    soloWide,
    soloNoBall,
    soloBye,
    soloLegBye,
    soloWicket,
    soloNewBowler,
    soloEndTurn,
  } = useMatch();
  const toast = useToast();
  const haptic = useHaptics();
  const [sheet, setSheet] = useState<SheetType>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!match) router.replace(ROUTES.soloSetup);
    else if (match.mode !== "solo") router.replace(ROUTES.score);
    else if (match.status === "complete") router.replace(ROUTES.soloResult);
  }, [hydrated, match, router]);

  const solo = match?.mode === "solo" ? match : null;
  const turn = solo?.turns[solo.currentTurnIndex] ?? null;

  const suggestedBowler = useMemo(() => {
    if (!solo || !turn) return null;
    const suggested = solo.suggestedBowlerId ?? turn.bowlerId;
    return suggested && suggested !== turn.batterId ? suggested : null;
  }, [solo, turn]);

  if (!hydrated || !solo || !turn) {
    return (
      <Screen className="min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </Screen>
    );
  }

  const batterName = soloPlayerName(solo, turn.batterId);
  const bowlerName = soloPlayerName(solo, turn.bowlerId);
  const ballLimit = ballsPerTurn(solo);
  const remaining = ballLimit == null ? null : Math.max(0, ballLimit - turn.legalBalls);
  const bowlers = availableBowlers(solo, turn);

  if (solo.status === "select_players") {
    return (
      <Screen className="min-h-dvh pb-[calc(var(--safe-bottom)+1.5rem)]">
        <div className="space-y-4 pt-[calc(var(--safe-top)+1rem)]">
          <div className="card p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              Turn {solo.currentTurnIndex + 1} of {solo.players.length}
            </p>
            <h1 className="mt-2 text-3xl font-black">{batterName} bats</h1>
            <p className="mt-1 text-sm text-white/50">
              Choose who bowls this turn. Batter plays {turnLengthLabel(solo)}.
            </p>
          </div>

          <div className="card p-4">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/55">
              Bowler
            </p>
            <PlayerPicker
              players={bowlers}
              selectedId={suggestedBowler}
              onSelect={(id) => {
                startSoloTurn(id);
                haptic("success");
              }}
              meta={(p) => (p.id === suggestedBowler ? <span>suggested</span> : null)}
            />
          </div>
        </div>
      </Screen>
    );
  }

  const closeSheet = () => setSheet(null);

  const handleRun = (runs: number) => {
    soloScoreRuns(runs);
    haptic(runs === 4 || runs === 6 ? "boundary" : "light");
    if (runs === 4) toast.success("FOUR!", "🏏");
    if (runs === 6) toast.success("SIX!", "💥");
  };

  const handleWicket = () => {
    soloWicket();
    toast.show("Wicket! Next batter in.", { variant: "wicket", emoji: "🎯" });
    haptic("wicket");
  };

  const handleEndTurn = () => {
    soloEndTurn();
    toast.show("Turn ended", { variant: "info", emoji: "🏁" });
    haptic("warning");
    closeSheet();
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 pt-[calc(var(--safe-top)+0.5rem)]">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold leading-tight">Solo Gully</p>
          <p className="text-[11px] text-white/45">
            Turn {solo.currentTurnIndex + 1}/{solo.players.length} · Bowler: {bowlerName}
          </p>
        </div>
        <button
          type="button"
          aria-label="Result"
          onClick={() => router.push(ROUTES.soloResult)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl glass text-lg active:scale-95"
        >
          🏆
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2.5 overflow-y-auto no-scrollbar px-4 py-2.5">
        <div className="card p-4">
          <div className="flex items-baseline justify-between">
            <span className="truncate text-sm font-bold text-white/80">{batterName}</span>
            <span className="text-[11px] font-semibold text-white/45">
              {oversDisplay(turn.legalBalls)} / {solo.oversPerPlayer == null ? "till out" : `${solo.oversPerPlayer} ov`}
            </span>
          </div>
          <div className="mt-1 flex items-end justify-between">
            <div className="tnum text-5xl font-black leading-none">
              {turn.runs}
              <span className="text-white/50">/</span>
              {turn.wickets}
            </div>
            <div className="text-right">
              <p className="tnum text-xl font-black text-accent-400">
                {remaining == null ? "∞" : remaining}
              </p>
              <p className="text-[11px] font-semibold text-white/40">
                {remaining == null ? "till out" : "balls left"}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">4/6</p>
              <p className="tnum text-lg font-black">{turn.fours}/{turn.sixes}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Extras</p>
              <p className="tnum text-lg font-black">{turn.extras.total}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Balls</p>
              <p className="tnum text-lg font-black">
                {turn.legalBalls}/{ballLimit == null ? "∞" : ballLimit}
              </p>
            </div>
          </div>
        </div>

        <div className="card px-4 py-3">
          <BallHistory label="Last" balls={turn.balls.slice(-8)} emptyHint="No balls yet" />
        </div>

        <div className="card p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/55">
            Leaderboard
          </p>
          <div className="space-y-1.5">
            {sortedTurns(solo).map((t, i) => (
              <div
                key={t.batterId}
                className={`flex items-center justify-between rounded-2xl px-3 py-2 ${
                  t.index === turn.index ? "bg-brand-500/15" : "bg-white/[0.04]"
                }`}
              >
                <span className="min-w-0 truncate text-sm font-bold">
                  {i + 1}. {soloPlayerName(solo, t.batterId)}
                </span>
                <span className="tnum text-sm font-black">
                  {t.runs}/{t.wickets}
                  <span className="ml-2 text-white/40">({oversDisplay(t.legalBalls)})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="mx-auto w-full max-w-md border-t border-white/10 bg-ink-950/70 px-4 pb-[calc(var(--safe-bottom)+0.25rem)] pt-2 backdrop-blur-xl">
        <ScoringPad
          onRun={handleRun}
          onWide={() => setSheet("wide")}
          onNoBall={() => setSheet("noball")}
          onBye={() => setSheet("bye")}
          onLegBye={() => setSheet("legbye")}
          onOut={handleWicket}
          onUndo={() => {
            if (!canUndo) return;
            undo();
            toast.info("Undone", "↩");
          }}
          onEndInnings={() => setSheet("endTurn")}
          onChangeBowler={() => setSheet("changeBowler")}
          onRetireHurt={() => setSheet("endTurn")}
          canUndo={canUndo}
        />
      </footer>

      <RunChoiceSheet
        open={sheet === "wide"}
        onClose={closeSheet}
        title="Wide"
        subtitle="1 wide + any runs run"
        options={WIDE_RUN_OPTIONS}
        columns={3}
        tone="accent"
        formatLabel={(n) => (n === 0 ? "Wide" : `+${n}`)}
        onSelect={(n) => {
          soloWide(n);
          haptic("light");
        }}
      />
      <RunChoiceSheet
        open={sheet === "noball"}
        onClose={closeSheet}
        title="No Ball"
        subtitle="1 no-ball + runs off the bat"
        options={NOBALL_RUN_OPTIONS}
        columns={3}
        tone="accent"
        formatLabel={(n) => (n === 0 ? "No ball" : `bat ${n}`)}
        onSelect={(n) => {
          soloNoBall(n);
          haptic("light");
        }}
      />
      <RunChoiceSheet
        open={sheet === "bye"}
        onClose={closeSheet}
        title="Byes"
        subtitle="Runs run as byes"
        options={BYE_RUN_OPTIONS}
        columns={3}
        onSelect={(n) => {
          soloBye(n);
          haptic("light");
        }}
      />
      <RunChoiceSheet
        open={sheet === "legbye"}
        onClose={closeSheet}
        title="Leg Byes"
        subtitle="Runs run as leg byes"
        options={BYE_RUN_OPTIONS}
        columns={3}
        onSelect={(n) => {
          soloLegBye(n);
          haptic("light");
        }}
      />

      <BottomSheet
        open={sheet === "changeBowler"}
        onClose={closeSheet}
        title="Change bowler"
        subtitle="Bowler cannot be the current batter"
      >
        <PlayerPicker
          players={bowlers}
          selectedId={turn.bowlerId}
          onSelect={(id) => {
            soloNewBowler(id);
            haptic("light");
            closeSheet();
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "endTurn"}
        onClose={closeSheet}
        title="End this turn?"
        subtitle={`${batterName}'s turn will close at ${turn.runs}/${turn.wickets}.`}
        footer={
          <Button variant="danger" size="lg" fullWidth onClick={handleEndTurn}>
            End turn
          </Button>
        }
      >
        <p className="text-sm text-white/55">
          Use this for local gully rules like retired hurt, bowler swap decisions, or stopping a turn early.
        </p>
      </BottomSheet>
    </div>
  );
}
