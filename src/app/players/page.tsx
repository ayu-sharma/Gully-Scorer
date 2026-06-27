"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen } from "@/components/ui/Screen";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants";
import { useHaptics } from "@/hooks/useHaptics";
import { useMatch } from "@/hooks/useMatch";
import { currentInnings, getTeamById } from "@/utils/cricket";

export default function PlayersPage() {
  const router = useRouter();
  const { match, hydrated, startInnings } = useMatch();
  const haptic = useHaptics();

  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");

  // Routing guards.
  useEffect(() => {
    if (!hydrated) return;
    if (!match) {
      router.replace(ROUTES.setup);
    } else if (match.status === "live") {
      router.replace(ROUTES.score);
    } else if (match.status === "complete") {
      router.replace(ROUTES.result);
    } else if (match.status === "toss") {
      router.replace(ROUTES.toss);
    }
  }, [hydrated, match, router]);

  if (!hydrated || !match) {
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
  const bowlingTeam = getTeamById(match, innings.bowlingTeamId);
  const isSecond = innings.index === 1;

  const batOptions: SelectOption[] = battingTeam.players.map((p) => ({ value: p.id, label: p.name }));
  const strikerOptions = batOptions.map((o) => ({ ...o, disabled: o.value === nonStrikerId }));
  const nonStrikerOptions = batOptions.map((o) => ({ ...o, disabled: o.value === strikerId }));
  const bowlerOptions: SelectOption[] = bowlingTeam.players.map((p) => ({ value: p.id, label: p.name }));

  const valid =
    strikerId && nonStrikerId && bowlerId && strikerId !== nonStrikerId;

  const handleContinue = () => {
    if (!valid) return;
    startInnings({ strikerId, nonStrikerId, bowlerId });
    haptic("success");
    router.push(ROUTES.score);
  };

  return (
    <Screen className="min-h-dvh pb-[calc(var(--safe-bottom)+1.5rem)]">
      <PageHeader
        title={isSecond ? "2nd Innings" : "Opening Players"}
        subtitle={`${battingTeam.name} batting`}
        showBack={!isSecond}
        onBack={() => router.push(ROUTES.toss)}
      />

      {isSecond && match.target != null && (
        <div className="card mb-4 bg-accent-500/10 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-400/80">Target</p>
          <p className="tnum text-3xl font-black text-accent-400">{match.target}</p>
          <p className="text-sm text-white/55">
            {battingTeam.name} need {match.target} to win in {match.oversPerInnings} overs
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="card space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
            {battingTeam.name} — openers
          </p>
          <Select
            label="On strike 🔆"
            value={strikerId}
            onChange={setStrikerId}
            options={strikerOptions}
            placeholder="Select striker"
          />
          <Select
            label="Non-striker"
            value={nonStrikerId}
            onChange={setNonStrikerId}
            options={nonStrikerOptions}
            placeholder="Select non-striker"
          />
        </div>

        <div className="card space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
            {bowlingTeam.name} — opening bowler
          </p>
          <Select
            label="Bowler 🎯"
            value={bowlerId}
            onChange={setBowlerId}
            options={bowlerOptions}
            placeholder="Select bowler"
          />
        </div>

        <Button size="xl" fullWidth disabled={!valid} onClick={handleContinue}>
          Start scoring →
        </Button>
      </div>
    </Screen>
  );
}
