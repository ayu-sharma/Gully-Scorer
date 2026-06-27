/** Pure display formatters. No state, easy to unit test. */

import { BALLS_PER_OVER } from "@/constants";

/** "5.3" — completed overs + balls in the current over. */
export function oversDisplay(legalBalls: number): string {
  const overs = Math.floor(legalBalls / BALLS_PER_OVER);
  const balls = legalBalls % BALLS_PER_OVER;
  return `${overs}.${balls}`;
}

/** Overs as a decimal for rate maths (e.g. 5.3 balls => 5.5 overs). */
export function oversAsNumber(legalBalls: number): number {
  return legalBalls / BALLS_PER_OVER;
}

/** Run rate to 2 dp, guarding against divide-by-zero. */
export function runRate(runs: number, legalBalls: number): string {
  if (legalBalls <= 0) return "0.00";
  return (runs / (legalBalls / BALLS_PER_OVER)).toFixed(2);
}

/**
 * Required run rate for the chasing side.
 * @param runsNeeded target - currentRuns
 * @param ballsRemaining legal balls left in the innings
 */
export function requiredRunRate(
  runsNeeded: number,
  ballsRemaining: number,
): string {
  if (ballsRemaining <= 0) return "—";
  if (runsNeeded <= 0) return "0.00";
  return (runsNeeded / (ballsRemaining / BALLS_PER_OVER)).toFixed(2);
}

/** Batting strike rate (runs per 100 balls). */
export function strikeRate(runs: number, balls: number): string {
  if (balls <= 0) return "0.0";
  return ((runs / balls) * 100).toFixed(1);
}

/** Bowling economy (runs per over). */
export function economy(runsConceded: number, legalBalls: number): string {
  if (legalBalls <= 0) return "0.00";
  return (runsConceded / (legalBalls / BALLS_PER_OVER)).toFixed(2);
}

/** Pluralise a count: pluralise(1, "wicket") => "1 wicket". */
export function pluralise(count: number, noun: string, plural?: string): string {
  const word = count === 1 ? noun : (plural ?? `${noun}s`);
  return `${count} ${word}`;
}

/** Trim and collapse whitespace; used on every typed name. */
export function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
