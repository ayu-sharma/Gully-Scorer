"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PlayersPanel } from "@/components/scoring/PlayersPanel";
import { RunChoiceSheet } from "@/components/scoring/RunChoiceSheet";
import { Scoreboard } from "@/components/scoring/Scoreboard";
import { ScoringPad } from "@/components/scoring/ScoringPad";
import { SelectBatsmanSheet } from "@/components/scoring/SelectBatsmanSheet";
import { SelectBowlerSheet } from "@/components/scoring/SelectBowlerSheet";
import { WicketSheet, type WicketSelection } from "@/components/scoring/WicketSheet";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ConnectionBadge } from "@/components/ui/ConnectionBadge";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { BYE_RUN_OPTIONS, NOBALL_RUN_OPTIONS, ROUTES, WIDE_RUN_OPTIONS } from "@/constants";
import { useHaptics } from "@/hooks/useHaptics";
import { useMatch } from "@/hooks/useMatch";
import { useToast } from "@/hooks/useToast";
import {
  currentInnings,
  getTeamById,
  needsNewBatsman,
  needsNewBowler,
} from "@/utils/cricket";

type SheetType =
  | "wide"
  | "noball"
  | "bye"
  | "legbye"
  | "wicket"
  | "changeBowler"
  | "endInnings"
  | "endMatch"
  | null;

export default function ScorePage() {
  const router = useRouter();
  const { match, hydrated, canUndo, ...actions } = useMatch();
  const toast = useToast();
  const haptic = useHaptics();

  const [sheet, setSheet] = useState<SheetType>(null);
  const closeSheet = () => setSheet(null);

  // Routing guards.
  useEffect(() => {
    if (!hydrated) return;
    if (!match) {
      router.replace(ROUTES.setup);
    } else if (match.status === "complete") {
      router.replace(ROUTES.result);
    } else if (match.status === "toss") {
      router.replace(ROUTES.toss);
    } else if (match.status === "select_players") {
      router.replace(ROUTES.players);
    }
  }, [hydrated, match, router]);

  if (!hydrated || !match) {
    return (
      <Screen className="min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </Screen>
    );
  }

  // ── Innings break ──────────────────────────────────────────────────────────
  if (match.status === "innings_break") {
    const first = match.innings[0];
    const firstTeam = getTeamById(match, first.battingTeamId);
    const chasingTeam = getTeamById(match, first.bowlingTeamId);
    return (
      <Screen className="min-h-dvh items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full space-y-5"
        >
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
          <Button size="xl" fullWidth onClick={() => router.push(ROUTES.players)}>
            Start {chasingTeam.name}&apos;s innings →
          </Button>
          <Button size="md" variant="ghost" fullWidth onClick={() => router.push(ROUTES.scorecard)}>
            View scorecard
          </Button>
        </motion.div>
      </Screen>
    );
  }

  if (match.status !== "live") {
    return (
      <Screen className="min-h-dvh items-center justify-center">
        <Spinner size={28} />
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
  const showBatsman = needsNewBatsman(innings);
  const showBowler = needsNewBowler(innings);
  const scoringDisabled = showBatsman || showBowler;

  // ── Action handlers ──────────────────────────────────────────────────────
  const onRun = (runs: number) => {
    actions.scoreRuns(runs);
    if (runs === 6) {
      toast.success("SIX!", "💥");
      haptic("boundary");
    } else if (runs === 4) {
      toast.success("FOUR!", "🏏");
      haptic("boundary");
    } else {
      haptic("light");
    }
  };

  const onUndo = () => {
    if (!canUndo) return;
    actions.undo();
    toast.info("Undone", "↩");
    haptic("medium");
  };

  const onWicketConfirm = (sel: WicketSelection) => {
    actions.wicket(sel);
    if (sel.dismissalType === "retired_hurt") {
      toast.show("Retired hurt", { variant: "info", emoji: "🤕" });
    } else {
      toast.show("WICKET!", { variant: "wicket", emoji: "🎯" });
      haptic("wicket");
    }
  };

  const onNewBatsman = (id: string) => {
    actions.newBatsman(id);
    haptic("light");
  };

  const onNewBowler = (id: string) => {
    actions.newBowler(id);
    haptic("light");
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Compact top bar */}
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 pt-[calc(var(--safe-top)+0.5rem)]">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold leading-tight">
            {battingTeam.name}
          </p>
          <p className="text-[11px] text-white/45">Innings {innings.index + 1} · tap to score</p>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionBadge />
          <button
            type="button"
            aria-label="Share viewer link"
            onClick={() => {
              const url = `${window.location.origin}/view?id=${match.id}`;
              if (navigator.share) {
                navigator.share({ title: "Live Score", url });
              } else {
                navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"));
              }
            }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl glass text-lg active:scale-95"
          >
            🔗
          </button>
          <button
            type="button"
            aria-label="Scorecard"
            onClick={() => router.push(ROUTES.scorecard)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl glass text-lg active:scale-95"
          >
            📋
          </button>
          <button
            type="button"
            aria-label="End match"
            onClick={() => setSheet("endMatch")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-danger-400/40 bg-danger-500/15 text-danger-300 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </header>

      {/* Live panels */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2 sm:gap-2.5 overflow-y-auto no-scrollbar px-4 py-2 sm:py-2.5">
        <Scoreboard match={match} innings={innings} />
        <PlayersPanel match={match} innings={innings} />
      </div>

      {/* Scoring pad pinned to the bottom */}
      <footer className="mx-auto w-full max-w-md border-t border-white/10 bg-ink-950/70 px-4 pb-[calc(var(--safe-bottom)+0.25rem)] pt-2 sm:pt-2.5 backdrop-blur-xl">
        <ScoringPad
          onRun={onRun}
          onWide={() => setSheet("wide")}
          onNoBall={() => setSheet("noball")}
          onBye={() => setSheet("bye")}
          onLegBye={() => setSheet("legbye")}
          onOut={() => setSheet("wicket")}
          onUndo={onUndo}
          onEndInnings={() => setSheet("endInnings")}
          onChangeBowler={() => setSheet("changeBowler")}
          onRetireHurt={() => {
            actions.retireHurt();
            toast.show("Retired hurt", { variant: "info", emoji: "🤕" });
          }}
          canUndo={canUndo}
          disabled={scoringDisabled}
        />
      </footer>

      {/* ── Sheets ────────────────────────────────────────────────────────── */}
      <RunChoiceSheet
        open={sheet === "wide"}
        onClose={closeSheet}
        title="Wide"
        subtitle="1 wide + any runs the batsmen ran"
        options={WIDE_RUN_OPTIONS}
        columns={3}
        tone="accent"
        formatLabel={(n) => (n === 0 ? "Wide" : `+${n}`)}
        onSelect={(n) => {
          actions.wide(n);
          toast.show(n === 0 ? "Wide" : `Wide +${n}`, { variant: "info", emoji: "➕" });
          haptic("light");
        }}
      />
      <RunChoiceSheet
        open={sheet === "noball"}
        onClose={closeSheet}
        title="No Ball"
        subtitle="1 no-ball + runs scored off the bat"
        options={NOBALL_RUN_OPTIONS}
        columns={3}
        tone="accent"
        formatLabel={(n) => (n === 0 ? "No ball" : `bat ${n}`)}
        onSelect={(n) => {
          actions.noBall(n);
          toast.show(n === 0 ? "No ball" : `No ball + ${n}`, { variant: "info", emoji: "➕" });
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
          actions.bye(n);
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
          actions.legBye(n);
          haptic("light");
        }}
      />

      <WicketSheet
        open={sheet === "wicket"}
        onClose={closeSheet}
        match={match}
        innings={innings}
        onConfirm={onWicketConfirm}
      />

      {/* Manual bowler change (only when not already being forced to pick one) */}
      <SelectBowlerSheet
        open={sheet === "changeBowler" && !showBowler}
        onClose={closeSheet}
        match={match}
        innings={innings}
        dismissible
        excludeIds={innings.currentBowlerId ? [innings.currentBowlerId] : []}
        onSelect={(id) => {
          onNewBowler(id);
          closeSheet();
        }}
      />

      <ConfirmDialog
        open={sheet === "endInnings"}
        onClose={closeSheet}
        title="End this innings?"
        message="The innings will close at the current score."
        confirmLabel="End innings"
        danger
        onConfirm={() => {
          actions.endInnings();
          haptic("warning");
        }}
      />

      <ConfirmDialog
        open={sheet === "endMatch"}
        onClose={closeSheet}
        title="End the whole match?"
        message="The match will be finished at the current score and the result declared. This can't be undone from the result screen."
        confirmLabel="End match"
        danger
        onConfirm={() => {
          actions.endMatch();
          haptic("warning");
          router.replace(ROUTES.result);
        }}
      />

      {/* Auto-prompts driven by match state */}
      <SelectBatsmanSheet
        open={showBatsman}
        match={match}
        innings={innings}
        onSelect={onNewBatsman}
        onUndo={onUndo}
        canUndo={canUndo}
      />
      <SelectBowlerSheet
        open={showBowler}
        match={match}
        innings={innings}
        dismissible={false}
        onSelect={onNewBowler}
      />
    </div>
  );
}
