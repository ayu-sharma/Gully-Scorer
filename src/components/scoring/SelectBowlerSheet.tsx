"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { PlayerPicker } from "@/components/ui/PlayerPicker";
import type { Innings, MatchState } from "@/types";
import { availableBowlers, getBowler } from "@/utils/cricket";
import { economy, oversDisplay } from "@/utils/format";

export function SelectBowlerSheet({
  open,
  match,
  innings,
  onSelect,
  onClose,
  dismissible = false,
  excludeIds = [],
}: {
  open: boolean;
  match: MatchState;
  innings: Innings;
  onSelect: (bowlerId: string) => void;
  onClose?: () => void;
  dismissible?: boolean;
  excludeIds?: string[];
}) {
  const exclude = new Set(excludeIds);
  const players = availableBowlers(match, innings).filter((p) => !exclude.has(p.id));

  return (
    <BottomSheet
      open={open}
      onClose={onClose ?? (() => {})}
      dismissible={dismissible}
      title="Bowler for this over"
      subtitle="A bowler can't bowl two overs in a row"
    >
      <PlayerPicker
        players={players}
        onSelect={onSelect}
        emptyLabel="No bowlers available"
        meta={(p) => {
          const b = getBowler(innings, p.id);
          if (!b || b.balls === 0) return <span className="text-white/35">yet to bowl</span>;
          return (
            <span className="tnum">
              {oversDisplay(b.balls)}-{b.runsConceded}-{b.wickets} · {economy(b.runsConceded, b.balls)}
            </span>
          );
        }}
      />
    </BottomSheet>
  );
}
