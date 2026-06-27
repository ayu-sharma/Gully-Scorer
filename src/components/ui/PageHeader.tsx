"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  onBack,
  right,
  showBack = true,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  showBack?: boolean;
}) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-3 px-1 pb-4 pt-[calc(var(--safe-top)+0.5rem)]">
      {showBack && (
        <button
          type="button"
          aria-label="Back"
          onClick={() => (onBack ? onBack() : router.back())}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl glass text-white/80 active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-white/55">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
