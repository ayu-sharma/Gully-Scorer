import type { ReactNode } from "react";

/**
 * Centered, mobile-first page container. Caps width on large screens so the
 * one-thumb layout stays phone-shaped on desktop too.
 */
export function Screen({
  children,
  className = "",
  noPadding = false,
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <main
      className={`mx-auto flex w-full max-w-md flex-col ${
        noPadding ? "" : "px-4"
      } ${className}`}
    >
      {children}
    </main>
  );
}
