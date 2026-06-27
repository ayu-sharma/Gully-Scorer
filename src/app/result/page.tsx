"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants";
import { useMatch } from "@/hooks/useMatch";
import { getTeamById } from "@/utils/cricket";
import { oversDisplay } from "@/utils/format";

const CONFETTI_COLORS = ["#22dd8a", "#4cc9f0", "#ffb020", "#f43f5e", "#cdfee3"];

function Confetti() {
  // Deterministic-enough scatter computed once on mount.
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block rounded-sm"
          style={{ left: `${p.x}%`, width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ y: -40, opacity: 0, rotate: p.rotate }}
          animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: p.rotate + 360 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn", repeat: Infinity, repeatDelay: 1.2 }}
        />
      ))}
    </div>
  );
}

export default function ResultPage() {
  const router = useRouter();
  const { match, hydrated, newMatch } = useMatch();

  useEffect(() => {
    if (!hydrated) return;
    if (!match) router.replace(ROUTES.setup);
    else if (match.status !== "complete") router.replace(ROUTES.score);
  }, [hydrated, match, router]);

  if (!hydrated || !match || !match.result) {
    return (
      <Screen className="min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </Screen>
    );
  }

  const { result } = match;
  const hasWinner = !result.isTie && result.winnerTeamId != null;
  const icon = result.isTie ? "🤝" : hasWinner ? "🏆" : "🏁";
  const label = result.isTie ? "It's a tie!" : hasWinner ? "Winner" : "Result";

  const handleNewMatch = () => {
    newMatch();
    router.push(ROUTES.home);
  };

  return (
    <div className="relative min-h-dvh">
      {hasWinner && <Confetti />}
      <Screen className="relative min-h-dvh justify-between pb-[calc(var(--safe-bottom)+1.5rem)] pt-[calc(var(--safe-top)+2rem)]">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="mb-4 text-7xl"
          >
            {icon}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-semibold uppercase tracking-[0.2em] text-white/40"
          >
            {label}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-1 text-4xl font-black tracking-tight"
          >
            {result.summary}
          </motion.h1>

          {/* Innings summaries */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="mt-8 w-full space-y-2.5"
          >
            {match.innings.map((inn) => {
              const team = getTeamById(match, inn.battingTeamId);
              const isWinner = result.winnerTeamId === team.id;
              return (
                <div
                  key={inn.index}
                  className={`card flex items-center justify-between p-4 ${
                    isWinner ? "border-brand-400/40 bg-brand-500/10" : ""
                  }`}
                >
                  <span className="flex items-center gap-2 font-bold">
                    {isWinner && <span>🏏</span>}
                    {team.name}
                  </span>
                  <span className="tnum text-xl font-black">
                    {inn.runs}/{inn.wickets}
                    <span className="ml-1 text-sm font-semibold text-white/45">
                      ({oversDisplay(inn.legalBalls)})
                    </span>
                  </span>
                </div>
              );
            })}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 space-y-2.5"
        >
          <Button size="xl" fullWidth onClick={() => router.push(ROUTES.scorecard)}>
            📋 Full scorecard
          </Button>
          <Button size="lg" variant="secondary" fullWidth onClick={handleNewMatch}>
            New match
          </Button>
        </motion.div>
      </Screen>
    </div>
  );
}
