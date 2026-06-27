"use client";

import { useCallback } from "react";

/** Vibration patterns (ms) for different scoring events. */
const PATTERNS: Record<string, number | number[]> = {
  light: 10,
  medium: 18,
  heavy: 30,
  success: [12, 40, 12],
  warning: [20, 60, 20],
  boundary: [10, 30, 10, 30],
  wicket: [40, 80, 40],
};

export type HapticPattern =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "boundary"
  | "wicket";

/**
 * Haptic feedback via the Vibration API. Silently no-ops where unsupported
 * (most iOS browsers), so it's always safe to call.
 */
export function useHaptics() {
  return useCallback((pattern: HapticPattern = "light") => {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
      return;
    }
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      /* ignore */
    }
  }, []);
}
