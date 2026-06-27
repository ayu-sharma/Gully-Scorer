"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { OptionGrid, type GridOption } from "@/components/ui/OptionGrid";

/**
 * Generic "pick a number of runs" sheet, used for Wide, No-ball, Bye and
 * Leg-bye. The page supplies the options and what happens on select.
 */
export function RunChoiceSheet({
  open,
  onClose,
  title,
  subtitle,
  options,
  onSelect,
  columns = 3,
  formatLabel = (n) => String(n),
  tone = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: readonly number[];
  onSelect: (runs: number) => void;
  columns?: 2 | 3 | 4;
  formatLabel?: (n: number) => string;
  tone?: GridOption<number>["tone"];
}) {
  const gridOptions: GridOption<number>[] = options.map((n) => ({
    value: n,
    label: formatLabel(n),
    tone,
  }));

  return (
    <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <OptionGrid
        options={gridOptions}
        columns={columns}
        onSelect={(n) => {
          onSelect(n);
          onClose();
        }}
      />
    </BottomSheet>
  );
}
