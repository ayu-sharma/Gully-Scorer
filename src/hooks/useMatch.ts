"use client";

import { useContext } from "react";

import { MatchContext, type MatchContextValue } from "@/context/MatchContext";

/** Access the live match and its action helpers. Must be inside <MatchProvider>. */
export function useMatch(): MatchContextValue {
  const ctx = useContext(MatchContext);
  if (!ctx) {
    throw new Error("useMatch must be used within a <MatchProvider>");
  }
  return ctx;
}
