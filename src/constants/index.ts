/** App-wide constants: routes, labels, defaults and scoring config. */

import type { DismissalType, ExtraType } from "@/types";

export const APP_NAME = "Gully Scorer";
export const APP_TAGLINE = "Score a whole match with one thumb.";
export const APP_DESCRIPTION =
  "A fast, mobile-first cricket scorer for local tournaments and gully cricket. Buttons, bottom sheets and dropdowns — almost zero typing.";

/** Default number of players per side. */
export const PLAYERS_PER_SIDE = 11;

/** Players-per-side choices offered during setup. */
export const PLAYERS_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/** Bounds for players per side. */
export const MIN_PLAYERS_PER_SIDE = 2;
export const MAX_PLAYERS_PER_SIDE = 15;

/** Default overs per innings offered during setup. */
export const DEFAULT_OVERS = 20;
export const OVERS_OPTIONS = [5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];
export const SOLO_PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const SOLO_OVERS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const BALLS_PER_OVER = 6;

export const ROUTES = {
  home: "/",
  setup: "/setup",
  toss: "/toss",
  players: "/players",
  score: "/score",
  scorecard: "/scorecard",
  result: "/result",
  soloSetup: "/solo/setup",
  soloScore: "/solo/score",
  soloResult: "/solo/result",
} as const;

/** LocalStorage keys. */
export const STORAGE_KEYS = {
  match: "gully-scorer:match:v1",
  syncQueue: "gully-scorer:sync-queue:v1",
} as const;

/** Run buttons on the main pad. */
export const RUN_BUTTONS = [0, 1, 2, 3, 4, 6] as const;

/** Additional runs offered for a wide. */
export const WIDE_RUN_OPTIONS = [0, 1, 2, 3, 4, 5] as const;
/** Runs off the bat offered for a no-ball. */
export const NOBALL_RUN_OPTIONS = [0, 1, 2, 3, 4, 6] as const;
/** Runs run for byes / leg-byes. */
export const BYE_RUN_OPTIONS = [1, 2, 3, 4, 5] as const;

export const DISMISSAL_LABELS: Record<DismissalType, string> = {
  bowled: "Bowled",
  caught: "Caught",
  lbw: "LBW",
  run_out: "Run Out",
  stumped: "Stumped",
  hit_wicket: "Hit Wicket",
  retired_hurt: "Retired Hurt",
};

/** Dismissals offered on the OUT sheet, in display order. */
export const DISMISSAL_OPTIONS: DismissalType[] = [
  "bowled",
  "caught",
  "lbw",
  "run_out",
  "stumped",
  "hit_wicket",
  "retired_hurt",
];

/** Dismissals that are credited to the bowler. */
export const BOWLER_CREDITED_DISMISSALS: DismissalType[] = [
  "bowled",
  "caught",
  "lbw",
  "stumped",
  "hit_wicket",
];

export const EXTRA_LABELS: Record<ExtraType, string> = {
  wide: "Wide",
  noball: "No Ball",
  bye: "Bye",
  legbye: "Leg Bye",
};

export const EXTRA_SHORT: Record<ExtraType, string> = {
  wide: "Wd",
  noball: "Nb",
  bye: "B",
  legbye: "Lb",
};
