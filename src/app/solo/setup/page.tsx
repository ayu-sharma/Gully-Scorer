"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen } from "@/components/ui/Screen";
import { TextInput } from "@/components/ui/TextInput";
import { ROUTES, SOLO_OVERS_OPTIONS, SOLO_PLAYER_OPTIONS } from "@/constants";
import { useHaptics } from "@/hooks/useHaptics";
import { useMatch } from "@/hooks/useMatch";
import { useToast } from "@/hooks/useToast";
import { cleanName } from "@/utils/format";

const DEFAULT_SOLO_PLAYERS = 4;
type SoloOversChoice = number | null;

const emptyPlayers = (count: number) => Array.from({ length: count }, () => "");
const resizePlayers = (players: string[], count: number) =>
  Array.from({ length: count }, (_, i) => players[i] ?? "");

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function SoloSetupPage() {
  const router = useRouter();
  const { initSoloMatch } = useMatch();
  const toast = useToast();
  const haptic = useHaptics();

  const [playerCount, setPlayerCount] = useState(DEFAULT_SOLO_PLAYERS);
  const [players, setPlayers] = useState<string[]>(() => emptyPlayers(DEFAULT_SOLO_PLAYERS));
  const [oversPerPlayer, setOversPerPlayer] = useState<SoloOversChoice>(1);

  const changePlayerCount = (count: number) => {
    setPlayerCount(count);
    setPlayers((prev) => resizePlayers(prev, count));
  };

  const updatePlayer = (index: number, value: string) => {
    setPlayers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleShuffle = () => {
    setPlayers((prev) => shuffle(prev));
    haptic("medium");
  };

  const handleStart = () => {
    const finalPlayers = players.map((p, i) => cleanName(p) || `Player ${i + 1}`);
    initSoloMatch({ players: finalPlayers, oversPerPlayer });
    haptic("success");
    toast.success("Solo match ready", "🏏");
    router.push(ROUTES.soloScore);
  };

  return (
    <Screen className="min-h-dvh pb-[calc(var(--safe-bottom)+5.5rem)]">
      <PageHeader
        title="Solo Gully"
        subtitle="Everyone bats once. Highest score wins."
        onBack={() => router.push(ROUTES.home)}
      />

      <div className="space-y-4">
        <div className="card p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/55">
            Players
          </p>
          <div className="flex flex-wrap gap-2">
            {SOLO_PLAYER_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => changePlayerCount(n)}
                className={`tnum min-h-[44px] min-w-[52px] rounded-2xl border px-3 text-base font-bold transition-colors ${
                  playerCount === n
                    ? "border-brand-400 bg-brand-500/20 text-brand-200"
                    : "border-white/10 bg-white/[0.05] text-white/70 active:bg-white/10"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/55">
            Turn length
          </p>
          <div className="flex flex-wrap gap-2">
            {SOLO_OVERS_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOversPerPlayer(o)}
                className={`tnum min-h-[44px] min-w-[52px] rounded-2xl border px-3 text-base font-bold transition-colors ${
                  oversPerPlayer === o
                    ? "border-brand-400 bg-brand-500/20 text-brand-200"
                    : "border-white/10 bg-white/[0.05] text-white/70 active:bg-white/10"
                }`}
              >
                {o}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOversPerPlayer(null)}
              className={`min-h-[44px] rounded-2xl border px-3 text-base font-bold transition-colors ${
                oversPerPlayer === null
                  ? "border-brand-400 bg-brand-500/20 text-brand-200"
                  : "border-white/10 bg-white/[0.05] text-white/70 active:bg-white/10"
              }`}
            >
              Till out
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/40">
            Till out means there is no over limit. The turn ends on wicket or manual end.
          </p>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
              Batting order
            </p>
            <button
              type="button"
              onClick={handleShuffle}
              className="rounded-xl bg-white/[0.07] px-3 py-2 text-xs font-bold text-white/70 active:bg-white/10"
            >
              Shuffle
            </button>
          </div>

          <p className="mb-2 text-[11px] text-white/40">
            Leave blanks to auto-name players. The order below is the batting turn order.
          </p>

          <motion.div layout className="space-y-2">
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="tnum w-6 shrink-0 text-center text-sm font-bold text-white/40">
                  {i + 1}
                </span>
                <TextInput
                  value={p}
                  onChange={(e) => updatePlayer(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  maxLength={28}
                  autoComplete="off"
                  className="!min-h-[48px]"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-950/80 px-4 pb-[calc(var(--safe-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <Button size="xl" fullWidth onClick={handleStart}>
            Start Solo Gully →
          </Button>
        </div>
      </div>
    </Screen>
  );
}
