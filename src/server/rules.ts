// Score rules, version 1. These are the server's checks for a ranked run (PRD 7.2).
// Duration is always measured by the server, from session creation to submission.
// Trust assumption: within these bounds a score is still client-reported. The checks stop
// impossible results, not a careful cheat. Values marked (confirm) need sign-off before rewards.

export const RULES_VERSION = 1;

export type GameRules = {
  /** Shortest run the game allows, in ms. (confirm) */
  minDurationMs: number;
  /** A run must be submitted within this time of starting. */
  maxDurationMs: number;
  /** Highest score possible for a run of this length. (confirm) */
  ceiling: (durationMs: number) => number;
  /** Absolute cap whatever the length. (confirm) */
  absoluteMax: number;
};

const HOURS_2 = 2 * 60 * 60 * 1000;

export const rules: Record<string, GameRules> = {
  hextris: {
    minDurationMs: 20_000,
    maxDurationMs: HOURS_2,
    ceiling: (ms) => Math.floor(200 + (ms / 1000) * 100),
    absoluteMax: 200_000,
  },
  'tower-blocks': {
    minDurationMs: 5_000,
    maxDurationMs: HOURS_2,
    ceiling: (ms) => Math.floor(ms / 300),
    absoluteMax: 1_000,
  },
  astray: {
    minDurationMs: 10_000,
    maxDurationMs: HOURS_2,
    ceiling: (ms) => Math.floor(ms / 4_000),
    absoluteMax: 200,
  },
};

export type Verdict = { ok: true } | { ok: false; code: RejectCode; reason: string };

export type RejectCode = 'unknown-game' | 'bad-score' | 'too-fast' | 'too-slow' | 'over-ceiling';

/** Checks one finished run. Pure: easy to test, and the same function the API uses. */
export function checkRun(gameId: string, score: unknown, durationMs: number): Verdict {
  const r = rules[gameId];
  if (!r) return { ok: false, code: 'unknown-game', reason: 'This game is not open for ranked play.' };
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0) {
    return { ok: false, code: 'bad-score', reason: 'The score was not a whole number of zero or more.' };
  }
  if (durationMs < r.minDurationMs) {
    return { ok: false, code: 'too-fast', reason: `This run ended faster than the game allows (minimum ${Math.round(r.minDurationMs / 1000)} s).` };
  }
  if (durationMs > r.maxDurationMs) {
    return { ok: false, code: 'too-slow', reason: 'This run was submitted more than two hours after it started.' };
  }
  const max = Math.min(r.ceiling(durationMs), r.absoluteMax);
  if (score > max) {
    return { ok: false, code: 'over-ceiling', reason: 'This score is higher than the game allows for the time played.' };
  }
  return { ok: true };
}
