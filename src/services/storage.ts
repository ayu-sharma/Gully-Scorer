/**
 * LocalStorage persistence. SSR-safe (all access guarded) and resilient to
 * quota / parse errors so a corrupt entry can never crash the app.
 */

import { STORAGE_KEYS } from "@/constants";
import type { AppMatch, MatchState } from "@/types";

const isBrowser = typeof window !== "undefined";

function readJSON<T>(key: string): T | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage unavailable — degrade silently.
  }
}

function remove(key: string): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const storage = {
  loadMatch(): AppMatch | null {
    const match = readJSON<AppMatch | MatchState>(STORAGE_KEYS.match);
    if (match && typeof match === "object" && !("mode" in match)) {
      const legacy = match as MatchState;
      return { ...legacy, mode: "team" };
    }
    return match;
  },
  saveMatch(match: AppMatch): void {
    writeJSON(STORAGE_KEYS.match, match);
  },
  clearMatch(): void {
    remove(STORAGE_KEYS.match);
  },
  readRaw<T>(key: string): T | null {
    return readJSON<T>(key);
  },
  writeRaw(key: string, value: unknown): void {
    writeJSON(key, value);
  },
};
