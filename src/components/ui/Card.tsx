import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={`card ${padded ? "p-4" : ""} ${className}`}>{children}</div>;
}

/** A small labelled stat block, e.g. CRR / RRR / Target. */
export function StatTile({
  label,
  value,
  sub,
  accent = "default",
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: "default" | "brand" | "accent" | "danger" | "info";
  className?: string;
}) {
  const accentClass = {
    default: "text-white",
    brand: "text-brand-300",
    accent: "text-accent-400",
    danger: "text-danger-400",
    info: "text-info-400",
  }[accent];
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl bg-white/[0.04] px-2 py-1.5 sm:py-2 ${className}`}>
      <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
      <span className={`tnum text-base sm:text-lg font-extrabold leading-tight ${accentClass}`}>{value}</span>
      {sub != null && <span className="tnum text-[10px] text-white/40">{sub}</span>}
    </div>
  );
}
