"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TextInput } from "@/components/ui/TextInput";
import {
  DEFAULT_OVERS,
  OVERS_OPTIONS,
  PLAYERS_OPTIONS,
  PLAYERS_PER_SIDE,
  ROUTES,
} from "@/constants";
import { useHaptics } from "@/hooks/useHaptics";
import { useToast } from "@/hooks/useToast";
import { useMatch } from "@/hooks/useMatch";
import { cleanName } from "@/utils/format";

const emptyXI = (count: number) => Array.from({ length: count }, () => "");

/** Grow or shrink a squad list to `count`, preserving entered names. */
const resizeSquad = (squad: string[], count: number) =>
  Array.from({ length: count }, (_, i) => squad[i] ?? "");

export default function SetupPage() {
  const router = useRouter();
  const { initMatch } = useMatch();
  const toast = useToast();
  const haptic = useHaptics();

  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [playersPerSide, setPlayersPerSide] = useState(PLAYERS_PER_SIDE);
  const [playersA, setPlayersA] = useState<string[]>(() => emptyXI(PLAYERS_PER_SIDE));
  const [playersB, setPlayersB] = useState<string[]>(() => emptyXI(PLAYERS_PER_SIDE));
  const [overs, setOvers] = useState(DEFAULT_OVERS);
  const [active, setActive] = useState<"A" | "B">("A");

  const players = active === "A" ? playersA : playersB;
  const setPlayers = active === "A" ? setPlayersA : setPlayersB;

  const changePlayerCount = (count: number) => {
    setPlayersPerSide(count);
    setPlayersA((prev) => resizeSquad(prev, count));
    setPlayersB((prev) => resizeSquad(prev, count));
  };

  const filledA = useMemo(() => playersA.filter((p) => cleanName(p)).length, [playersA]);
  const filledB = useMemo(() => playersB.filter((p) => cleanName(p)).length, [playersB]);

  const updatePlayer = (index: number, value: string) => {
    setPlayers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleContinue = () => {
    const nameA = cleanName(teamA) || "Team A";
    const nameB = cleanName(teamB) || "Team B";
    // Blank slots are auto-named so the scorer can start instantly.
    const finalA = playersA.map((p, i) => cleanName(p) || `${nameA} ${i + 1}`);
    const finalB = playersB.map((p, i) => cleanName(p) || `${nameB} ${i + 1}`);

    initMatch({
      teamAName: nameA,
      teamBName: nameB,
      teamAPlayers: finalA,
      teamBPlayers: finalB,
      overs,
      playersPerSide,
    });
    haptic("success");
    toast.success("Teams saved", "💾");
    router.push(ROUTES.toss);
  };

  const teamName = active === "A" ? cleanName(teamA) || "Team A" : cleanName(teamB) || "Team B";

  return (
    <Screen className="min-h-dvh pb-[calc(var(--safe-bottom)+5.5rem)]">
      <PageHeader title="Match Setup" subtitle="Name the teams, then tap Continue" onBack={() => router.push(ROUTES.home)} />

      <div className="space-y-4">
        {/* Team names */}
        <div className="card space-y-3 p-4">
          <TextInput
            label="Team A"
            value={teamA}
            onChange={(e) => setTeamA(e.target.value)}
            placeholder="Team A"
            maxLength={28}
            autoComplete="off"
          />
          <TextInput
            label="Team B"
            value={teamB}
            onChange={(e) => setTeamB(e.target.value)}
            placeholder="Team B"
            maxLength={28}
            autoComplete="off"
          />
        </div>

        {/* Overs */}
        <div className="card p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/55">
            Overs per innings
          </p>
          <div className="flex flex-wrap gap-2">
            {OVERS_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOvers(o)}
                className={`tnum min-h-[44px] min-w-[52px] rounded-2xl border px-3 text-base font-bold transition-colors ${
                  overs === o
                    ? "border-brand-400 bg-brand-500/20 text-brand-200"
                    : "border-white/10 bg-white/[0.05] text-white/70 active:bg-white/10"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Players per side */}
        <div className="card p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/55">
            Players per side
          </p>
          <div className="flex flex-wrap gap-2">
            {PLAYERS_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => changePlayerCount(n)}
                className={`tnum min-h-[44px] min-w-[52px] rounded-2xl border px-3 text-base font-bold transition-colors ${
                  playersPerSide === n
                    ? "border-brand-400 bg-brand-500/20 text-brand-200"
                    : "border-white/10 bg-white/[0.05] text-white/70 active:bg-white/10"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
              Players
            </p>
            <span className="text-xs text-white/40">
              {active === "A" ? filledA : filledB}/{playersPerSide} named
            </span>
          </div>

          <SegmentedControl<"A" | "B">
            segments={[
              { value: "A", label: `${cleanName(teamA) || "Team A"} (${filledA})` },
              { value: "B", label: `${cleanName(teamB) || "Team B"} (${filledB})` },
            ]}
            value={active}
            onChange={setActive}
          />

          <p className="mb-2 mt-3 text-[11px] text-white/40">
            Leave blank to auto-name (e.g. “{teamName} 3”). You can edit anytime.
          </p>

          <motion.div
            key={active}
            initial={{ opacity: 0, x: active === "A" ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="tnum w-6 shrink-0 text-center text-sm font-bold text-white/40">
                  {i + 1}
                </span>
                <TextInput
                  value={p}
                  onChange={(e) => updatePlayer(i, e.target.value)}
                  placeholder={`${teamName} ${i + 1}`}
                  maxLength={28}
                  autoComplete="off"
                  className="!min-h-[48px]"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Sticky continue */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-950/80 px-4 pb-[calc(var(--safe-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <Button size="xl" fullWidth onClick={handleContinue}>
            Save &amp; Continue →
          </Button>
        </div>
      </div>
    </Screen>
  );
}
