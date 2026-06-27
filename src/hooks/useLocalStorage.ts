"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A typed, SSR-safe `useState` mirror that persists to LocalStorage. Used for
 * lightweight UI drafts (e.g. remembering the last team names on setup).
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  // Read once on mount (avoids hydration mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* ignore */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update] as const;
}
