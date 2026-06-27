"use client";

import type { ReactNode } from "react";

import { MatchProvider } from "@/context/MatchContext";
import { ToastProvider } from "@/components/ui/Toast";

/** Client-side provider tree shared by every page. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <MatchProvider>{children}</MatchProvider>
    </ToastProvider>
  );
}
