"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { airtableConfigured } from "@/services/airtable";

/** Small pill showing live connectivity + whether Airtable sync is active. */
export function ConnectionBadge() {
  const online = useOnlineStatus();
  const synced = airtableConfigured();

  const label = !online ? "Offline" : synced ? "Synced" : "Local";
  const dot = !online ? "bg-accent-400" : synced ? "bg-brand-400" : "bg-white/40";
  const title = !online
    ? "Offline — saved locally, will sync on reconnect"
    : synced
      ? "Saving to Airtable + this device"
      : "Saved on this device";

  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs font-semibold text-white/70"
    >
      <span className={`h-2 w-2 rounded-full ${dot} ${online ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}
