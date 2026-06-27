/**
 * Small id helpers. Prefer crypto.randomUUID when available, fall back to a
 * timestamp + counter so ids remain unique even in older WebViews.
 */

let counter = 0;

export function uid(prefix = "id"): string {
  counter = (counter + 1) % 1_000_000;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const time = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 1_000_000).toString(36);
  return `${prefix}_${time}${counter.toString(36)}${rand}`;
}
