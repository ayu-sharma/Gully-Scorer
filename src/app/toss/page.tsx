"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants";
import { useHaptics } from "@/hooks/useHaptics";
import { useMatch } from "@/hooks/useMatch";
import type { TossCall, TossDecision } from "@/types";

function CoinFace({ label, back, gradient }: { label: string; back?: boolean; gradient: string }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br text-5xl font-black text-ink-950 shadow-glow ${gradient}`}
      style={{
        backfaceVisibility: "hidden",
        transform: back ? "rotateX(180deg)" : undefined,
      }}
    >
      {label}
    </div>
  );
}

export default function TossPage() {
  const router = useRouter();
  const { match, hydrated, setToss } = useMatch();
  const haptic = useHaptics();

  const [caller, setCaller] = useState<string | null>(null);
  const [call, setCall] = useState<TossCall | null>(null);
  const [flipId, setFlipId] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<TossCall | null>(null);
  const [decision, setDecision] = useState<TossDecision | null>(null);

  useEffect(() => {
    if (hydrated && !match) router.replace(ROUTES.setup);
    else if (hydrated && match?.mode === "solo") router.replace(ROUTES.soloScore);
  }, [hydrated, match, router]);

  if (!hydrated || !match || match.mode !== "team") {
    return (
      <Screen className="min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </Screen>
    );
  }

  const winnerTeamId =
    result && caller
      ? call === result
        ? caller
        : match.teamA.id === caller
          ? match.teamB.id
          : match.teamA.id
      : null;
  const winnerName = winnerTeamId
    ? winnerTeamId === match.teamA.id
      ? match.teamA.name
      : match.teamB.name
    : "";

  const target = 360 * 4 + (result === "tails" ? 180 : 0);

  const flip = () => {
    if (!caller || !call || flipping) return;
    const outcome: TossCall = Math.random() < 0.5 ? "heads" : "tails";
    setResult(outcome);
    setDecision(null);
    setFlipId((n) => n + 1);
    setFlipping(true);
    haptic("medium");
  };

  const onLanded = () => {
    setFlipping(false);
    haptic("success");
  };

  const handleContinue = () => {
    if (!caller || !call || !result || !winnerTeamId || !decision) return;
    setToss({ callerTeamId: caller, call, result, winnerTeamId, decision });
    haptic("success");
    router.push(ROUTES.players);
  };

  return (
    <Screen className="min-h-dvh pb-[calc(var(--safe-bottom)+1.5rem)]">
      <PageHeader title="Toss" subtitle={`${match.teamA.name} vs ${match.teamB.name}`} onBack={() => router.push(ROUTES.setup)} />

      <div className="space-y-4">
        {/* Who calls */}
        <div className="card p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/55">
            Who is calling?
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {[match.teamA, match.teamB].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCaller(t.id)}
                disabled={flipping}
                className={`min-h-[56px] truncate rounded-2xl border px-3 text-base font-bold transition-colors ${
                  caller === t.id
                    ? "border-brand-400 bg-brand-500/20 text-brand-100"
                    : "border-white/10 bg-white/[0.05] text-white/80 active:bg-white/10"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Heads / Tails */}
        <div className="card p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/55">
            Calling
          </p>
          <SegmentedControl<TossCall>
            segments={[
              { value: "heads", label: "Heads", emoji: "🪙" },
              { value: "tails", label: "Tails", emoji: "🎯" },
            ]}
            value={call}
            onChange={(v) => setCall(v)}
          />
        </div>

        {/* Coin */}
        <div className="card flex flex-col items-center gap-4 p-6">
          <div className="relative h-32 w-32" style={{ perspective: 900 }}>
            <motion.div
              key={flipId}
              className="relative h-full w-full"
              style={{ transformStyle: "preserve-3d" }}
              initial={{ rotateX: 0 }}
              animate={{ rotateX: flipId === 0 ? 0 : target }}
              transition={{ duration: 1.3, ease: [0.2, 0.6, 0.3, 1] }}
              onAnimationComplete={() => flipId > 0 && onLanded()}
            >
              <CoinFace label="H" gradient="from-accent-400 to-accent-600" />
              <CoinFace label="T" back gradient="from-info-400 to-info-500" />
            </motion.div>
            {flipId === 0 && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/10 text-5xl font-black text-white/30 backdrop-blur-sm">
                ?
              </div>
            )}
          </div>

          <Button
            size="lg"
            variant="accent"
            disabled={!caller || !call || flipping}
            onClick={flip}
            className="w-full"
          >
            {flipping ? "Flipping…" : result ? "Flip again" : "Flip Coin"}
          </Button>

          <AnimatePresence>
            {result && !flipping && winnerName && (
              <motion.p
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="text-center text-lg font-extrabold text-brand-300"
              >
                🎉 {winnerName} won the toss
                <span className="block text-xs font-medium text-white/45">
                  Landed on {result}
                </span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Bat or bowl */}
        <AnimatePresence>
          {result && !flipping && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="card overflow-hidden p-4"
            >
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-white/55">
                {winnerName} elects to
              </p>
              <SegmentedControl<TossDecision>
                size="lg"
                segments={[
                  { value: "bat", label: "Bat", emoji: "🏏" },
                  { value: "bowl", label: "Bowl", emoji: "🎳" },
                ]}
                value={decision}
                onChange={(v) => {
                  setDecision(v);
                  haptic("light");
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Button size="xl" fullWidth disabled={!decision} onClick={handleContinue}>
          Continue →
        </Button>
      </div>
    </Screen>
  );
}
