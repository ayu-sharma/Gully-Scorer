/**
 * Offline-first sync queue for Airtable.
 *
 * Behaviour:
 *  • Airtable not configured → every call is a silent no-op (nothing queued).
 *  • Online & configured     → write immediately; on failure the job is queued.
 *  • Offline                 → job is queued and flushed automatically on the
 *                              browser's `online` event.
 *
 * The queue itself is persisted to LocalStorage so it survives reloads.
 */

import { STORAGE_KEYS } from "@/constants";
import {
  airtableConfigured,
  ballFields,
  createRecord,
  matchFields,
  playerFields,
  teamFields,
} from "@/services/airtable";
import { storage } from "@/services/storage";
import type { BallEvent, Innings, MatchState, SyncJob, SyncTable } from "@/types";
import { uid } from "@/utils/id";

const MAX_ATTEMPTS = 8;
const isBrowser = typeof window !== "undefined";

function loadQueue(): SyncJob[] {
  return storage.readRaw<SyncJob[]>(STORAGE_KEYS.syncQueue) ?? [];
}

function saveQueue(queue: SyncJob[]): void {
  storage.writeRaw(STORAGE_KEYS.syncQueue, queue);
}

function isOnline(): boolean {
  return !isBrowser || navigator.onLine !== false;
}

let flushing = false;

/**
 * Try to drain the queue. Stops at the first failure and keeps the remaining
 * jobs for the next attempt. Jobs that exceed MAX_ATTEMPTS are dropped.
 */
export async function flushQueue(): Promise<void> {
  if (!airtableConfigured() || !isOnline() || flushing) return;
  flushing = true;
  try {
    let queue = loadQueue();
    while (queue.length > 0) {
      const job = queue[0];
      try {
        await createRecord(job.table, job.fields);
        queue = queue.slice(1);
        saveQueue(queue);
      } catch {
        job.attempts += 1;
        if (job.attempts >= MAX_ATTEMPTS) {
          queue = queue.slice(1); // give up on this one
        }
        saveQueue(queue);
        break; // network looks down — try again later
      }
    }
  } finally {
    flushing = false;
  }
}

function enqueue(table: SyncTable, fields: Record<string, unknown>): void {
  if (!airtableConfigured()) return; // nothing to do without credentials
  const job: SyncJob = {
    id: uid("job"),
    table,
    fields,
    createdAt: Date.now(),
    attempts: 0,
  };
  const queue = loadQueue();
  queue.push(job);
  saveQueue(queue);
  // Fire-and-forget; never blocks the scoring UI.
  void flushQueue();
}

// ── Public API used by the match context ──────────────────────────────────────

export const sync = {
  /** Push both teams and all 22 players (called once after setup). */
  teamsAndPlayers(match: MatchState): void {
    if (!airtableConfigured()) return;
    for (const team of [match.teamA, match.teamB]) {
      enqueue("Teams", teamFields(match, team));
      for (const player of team.players) {
        enqueue("Players", playerFields(match, team, player));
      }
    }
  },

  /** Create the initial / final Matches row. */
  match(match: MatchState): void {
    enqueue("Matches", matchFields(match));
  },

  /** Auto-save a single delivery. */
  ball(match: MatchState, innings: Innings, ball: BallEvent): void {
    enqueue("BallByBall", ballFields(match, innings, ball));
  },

  /** Attempt to flush the queue now. */
  flush(): Promise<void> {
    return flushQueue();
  },
};

/** Register the auto-flush-on-reconnect listener (call once on mount). */
export function initSync(): () => void {
  if (!isBrowser) return () => {};
  const onOnline = () => void flushQueue();
  window.addEventListener("online", onOnline);
  // Attempt an initial flush in case the queue has leftovers from last session.
  void flushQueue();
  return () => window.removeEventListener("online", onOnline);
}
