"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BallHistory } from "@/components/scoring/BallHistory";
import { InningsScorecard } from "@/components/scoring/InningsScorecard";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants";
import { useMatch } from "@/hooks/useMatch";
import { getTeamById, lastBalls } from "@/utils/cricket";
import { downloadFile, matchFileBase, matchToScorecardCSV } from "@/utils/export";

export default function ScorecardPage() {
  const router = useRouter();
  const { match, hydrated } = useMatch();
  const [tab, setTab] = useState<string>("0");

  useEffect(() => {
    if (hydrated && !match) router.replace(ROUTES.setup);
    else if (hydrated && match?.mode === "solo") router.replace(ROUTES.soloResult);
  }, [hydrated, match, router]);

  useEffect(() => {
    if (match?.mode === "team") setTab(String(match.currentInningsIndex));
  }, [match]);

  if (!hydrated || !match || match.mode !== "team") {
    return (
      <Screen className="min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </Screen>
    );
  }

  const inningsList = match.innings;
  const index = Math.min(Number(tab), inningsList.length - 1);
  const innings = inningsList[index];

  const backTarget =
    match.status === "complete"
      ? ROUTES.result
      : match.status === "live"
        ? ROUTES.score
        : ROUTES.home;

  return (
    <Screen className="min-h-dvh pb-[calc(var(--safe-bottom)+1.5rem)]">
      <PageHeader
        title="Scorecard"
        subtitle={`${match.teamA.name} vs ${match.teamB.name}`}
        onBack={() => router.push(backTarget)}
        right={
          <button
            type="button"
            aria-label="Download scorecard"
            onClick={() =>
              downloadFile(
                `${matchFileBase(match)}-scorecard.csv`,
                matchToScorecardCSV(match),
                "text/csv",
              )
            }
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl glass text-white/80 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16" />
            </svg>
          </button>
        }
      />

      {inningsList.length > 1 && (
        <div className="mb-4">
          <SegmentedControl
            segments={inningsList.map((inn) => ({
              value: String(inn.index),
              label: getTeamById(match, inn.battingTeamId).name,
            }))}
            value={String(index)}
            onChange={setTab}
          />
        </div>
      )}

      {innings && innings.balls.length > 0 && (
        <div className="card mb-3 px-4 py-3">
          <BallHistory label="Last 6" balls={lastBalls(innings, 6)} />
        </div>
      )}

      {innings && innings.balls.length > 0 ? (
        <InningsScorecard match={match} innings={innings} />
      ) : (
        <div className="card p-8 text-center text-white/50">No deliveries yet in this innings.</div>
      )}

      {match.result && (
        <div className="card mt-4 bg-brand-500/10 p-4 text-center">
          <p className="text-base font-extrabold text-brand-300">{match.result.summary}</p>
        </div>
      )}

      <div className="mt-5 space-y-2.5">
        {match.status === "live" && (
          <Button size="lg" fullWidth onClick={() => router.push(ROUTES.score)}>
            ← Back to scoring
          </Button>
        )}
        {match.status === "complete" && (
          <Button size="lg" fullWidth onClick={() => router.push(ROUTES.result)}>
            View result
          </Button>
        )}
      </div>
    </Screen>
  );
}
