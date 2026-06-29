"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Screen } from "@/components/ui/Screen";
import { APP_NAME, APP_TAGLINE, ROUTES } from "@/constants";
import { useMatch } from "@/hooks/useMatch";
import type { AppMatch, MatchStatus } from "@/types";

const FEATURES = [
  { emoji: "👍", title: "One-thumb scoring", text: "Big buttons, bottom sheets, zero typing." },
  { emoji: "🧮", title: "Every rule, automatic", text: "Strike, extras, overs & wickets handled." },
  { emoji: "☁️", title: "Saved as you go", text: "Local + Airtable sync, even offline." },
];

function routeForStatus(match: AppMatch): string {
  if (match.mode === "solo") {
    if (match.status === "complete") return ROUTES.soloResult;
    if (match.status === "live" || match.status === "select_players") return ROUTES.soloScore;
    return ROUTES.soloSetup;
  }
  const status: MatchStatus = match.status;
  switch (status) {
    case "toss":
      return ROUTES.toss;
    case "select_players":
    case "innings_break":
      return ROUTES.players;
    case "live":
      return ROUTES.score;
    case "complete":
      return ROUTES.result;
    default:
      return ROUTES.setup;
  }
}

export default function HeroPage() {
  const router = useRouter();
  const { match, hydrated } = useMatch();
  const [startOpen, setStartOpen] = useState(false);
  const hasResumable = hydrated && match && match.status !== "complete";
  const hasCompleted = hydrated && match && match.status === "complete";

  return (
    <Screen className="min-h-dvh justify-between pb-[calc(var(--safe-bottom)+1.5rem)] pt-[calc(var(--safe-top)+2rem)]">
      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-brand-400 to-brand-600 text-5xl shadow-glow"
        >
          🏏
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-5xl font-black tracking-tight"
        >
          {APP_NAME}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mt-3 max-w-xs text-lg font-medium text-white/60"
        >
          {APP_TAGLINE}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 w-full space-y-2.5"
        >
          {FEATURES.map((f) => (
            <div key={f.title} className="card flex items-center gap-3 p-3 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07] text-2xl">
                {f.emoji}
              </span>
              <div>
                <p className="text-sm font-bold">{f.title}</p>
                <p className="text-xs text-white/50">{f.text}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 space-y-2.5"
      >
        {hasResumable && (
          <Button
            size="xl"
            fullWidth
            onClick={() => router.push(routeForStatus(match!))}
          >
            Resume match →
          </Button>
        )}
        {hasCompleted && (
          <Button size="lg" variant="secondary" fullWidth onClick={() => router.push(ROUTES.result)}>
            View last result
          </Button>
        )}
        <Button
          size={hasResumable ? "lg" : "xl"}
          variant={hasResumable ? "secondary" : "primary"}
          fullWidth
          onClick={() => setStartOpen(true)}
        >
          {hasResumable ? "Start a new match" : "Start Match"}
        </Button>
      </motion.div>

      <BottomSheet
        open={startOpen}
        onClose={() => setStartOpen(false)}
        title="Choose match type"
        subtitle="Team match keeps the full cricket flow. Solo Gully is for individual batting turns."
      >
        <div className="space-y-2.5">
          <Button size="xl" fullWidth onClick={() => router.push(ROUTES.setup)}>
            Team Match
          </Button>
          <Button size="xl" variant="accent" fullWidth onClick={() => router.push(ROUTES.soloSetup)}>
            Solo Gully
          </Button>
        </div>
      </BottomSheet>
    </Screen>
  );
}
