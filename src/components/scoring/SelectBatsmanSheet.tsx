"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { PlayerPicker } from "@/components/ui/PlayerPicker";
import type { Innings, MatchState } from "@/types";
import { availableBatsmen } from "@/utils/cricket";

export function SelectBatsmanSheet({
  open,
  match,
  innings,
  onSelect,
  onUndo,
  canUndo,
}: {
  open: boolean;
  match: MatchState;
  innings: Innings;
  onSelect: (playerId: string) => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const players = availableBatsmen(match, innings);

  return (
    <BottomSheet
      open={open}
      onClose={() => {}}
      dismissible={false}
      title="Next batsman in"
      subtitle={`Wicket fell at ${innings.runs}/${innings.wickets}`}
      footer={
        canUndo ? (
          <Button variant="ghost" size="md" fullWidth onClick={onUndo}>
            ↩ Undo last ball
          </Button>
        ) : undefined
      }
    >
      <PlayerPicker players={players} onSelect={onSelect} emptyLabel="No batsmen left" />
    </BottomSheet>
  );
}
