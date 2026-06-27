"use client";

import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { OptionGrid, type GridOption } from "@/components/ui/OptionGrid";
import { DISMISSAL_LABELS, DISMISSAL_OPTIONS } from "@/constants";
import type { DismissalType, Innings, MatchState } from "@/types";
import { playerName } from "@/utils/cricket";

const EMOJI: Record<DismissalType, string> = {
  bowled: "🎯",
  caught: "🧤",
  lbw: "🦵",
  run_out: "🏃",
  stumped: "🧱",
  hit_wicket: "💥",
  retired_hurt: "🤕",
};

export interface WicketSelection {
  dismissalType: DismissalType;
  outBatsmanId: string;
  runsCompleted: number;
}

export function WicketSheet({
  open,
  onClose,
  match,
  innings,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  match: MatchState;
  innings: Innings;
  onConfirm: (selection: WicketSelection) => void;
}) {
  const [type, setType] = useState<DismissalType | null>(null);
  const [runOutRuns, setRunOutRuns] = useState(0);
  const [outId, setOutId] = useState<string | null>(null);

  // Reset whenever the sheet (re)opens.
  useEffect(() => {
    if (open) {
      setType(null);
      setRunOutRuns(0);
      setOutId(null);
    }
  }, [open]);

  const strikerId = innings.strikerId;
  const nonStrikerId = innings.nonStrikerId;

  const dismissalOptions: GridOption<DismissalType>[] = DISMISSAL_OPTIONS.map((d) => ({
    value: d,
    label: DISMISSAL_LABELS[d],
    emoji: EMOJI[d],
    tone: "danger",
  }));

  const handleType = (d: DismissalType) => {
    if (d === "run_out") {
      setType(d);
      setOutId(strikerId); // sensible default
      return;
    }
    // Straightforward dismissals resolve immediately.
    onConfirm({ dismissalType: d, outBatsmanId: strikerId ?? "", runsCompleted: 0 });
    onClose();
  };

  const confirmRunOut = () => {
    if (!type || !outId) return;
    onConfirm({ dismissalType: type, outBatsmanId: outId, runsCompleted: runOutRuns });
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={type === "run_out" ? "Run Out" : "How was the batsman out?"}
      subtitle={type === "run_out" ? "Runs completed before the run out, then who's out" : undefined}
    >
      {type !== "run_out" ? (
        <OptionGrid options={dismissalOptions} columns={2} onSelect={handleType} />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Runs completed
            </p>
            <OptionGrid
              options={[0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }))}
              columns={4}
              selected={runOutRuns}
              onSelect={setRunOutRuns}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Who is out?
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[strikerId, nonStrikerId].filter(Boolean).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOutId(id)}
                  className={`min-h-[56px] rounded-2xl border px-3 py-3 text-base font-bold transition-colors ${
                    outId === id
                      ? "border-danger-400 bg-danger-500/20 text-white"
                      : "border-white/10 bg-white/[0.05] text-white/80 active:bg-white/10"
                  }`}
                >
                  {playerName(match, id)}
                  <span className="block text-[11px] font-medium text-white/45">
                    {id === strikerId ? "on strike" : "non-striker"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button variant="ghost" size="md" fullWidth onClick={() => setType(null)}>
              Back
            </Button>
            <Button variant="danger" size="md" fullWidth disabled={!outId} onClick={confirmRunOut}>
              Confirm Run Out
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
