"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { airtableConfigured } from "@/services/airtable";
import { useHaptics } from "@/hooks/useHaptics";
import { useToast } from "@/hooks/useToast";
import type { MatchState } from "@/types";
import {
  downloadFile,
  matchFileBase,
  matchToBallByBallCSV,
  matchToJSON,
  matchToScorecardCSV,
} from "@/utils/export";

interface ExportOption {
  key: string;
  emoji: string;
  title: string;
  subtitle: string;
  filename: (base: string) => string;
  mime: string;
  build: (match: MatchState) => string;
}

const OPTIONS: ExportOption[] = [
  {
    key: "scorecard",
    emoji: "📋",
    title: "Scorecard (.csv)",
    subtitle: "Batting, bowling & extras — opens in Excel / Sheets",
    filename: (b) => `${b}-scorecard.csv`,
    mime: "text/csv",
    build: matchToScorecardCSV,
  },
  {
    key: "ballbyball",
    emoji: "🏏",
    title: "Ball-by-ball (.csv)",
    subtitle: "Every delivery with a running score",
    filename: (b) => `${b}-ball-by-ball.csv`,
    mime: "text/csv",
    build: matchToBallByBallCSV,
  },
  {
    key: "json",
    emoji: "💾",
    title: "Full backup (.json)",
    subtitle: "Complete match data to re-import or archive",
    filename: (b) => `${b}.json`,
    mime: "application/json",
    build: matchToJSON,
  },
];

export function ExportMatchButton({
  match,
  variant = "secondary",
  size = "lg",
  label = "⬇ Download sheet",
  className = "",
  /** Show even when Airtable is configured. Defaults to local-only. */
  alwaysShow = false,
}: {
  match: MatchState;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  label?: string;
  className?: string;
  alwaysShow?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const haptic = useHaptics();

  // Per the local-only requirement: the download is the offline alternative to
  // Airtable sync, so it only appears when Airtable isn't configured.
  if (!alwaysShow && airtableConfigured()) return null;

  const handleExport = (opt: ExportOption) => {
    try {
      const base = matchFileBase(match);
      downloadFile(opt.filename(base), opt.build(match), opt.mime);
      haptic("success");
      toast.success("Downloaded", "⬇");
    } catch {
      toast.error("Download failed");
    }
    setOpen(false);
  };

  return (
    <>
      <Button variant={variant} size={size} fullWidth className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Download match"
        subtitle="Saved on this device — export a copy to keep or share"
      >
        <div className="flex flex-col gap-2">
          {OPTIONS.map((opt) => (
            <motion.button
              key={opt.key}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleExport(opt)}
              className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-left active:bg-white/10"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07] text-2xl">
                {opt.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold">{opt.title}</span>
                <span className="block text-xs text-white/50">{opt.subtitle}</span>
              </span>
            </motion.button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
