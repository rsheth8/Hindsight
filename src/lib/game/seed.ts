/**
 * Deterministic, date-seeded randomness. Everyone gets the same puzzle on the
 * same day (the single choice that unlocks streaks, a shared leaderboard, and a
 * "how the crowd answered" reveal). Pure + dependency-free.
 */

/** mulberry32 PRNG — small, fast, good enough for puzzle selection. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turn a string (e.g. a date) into a 32-bit seed. */
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Today's puzzle date key in the app's reference timezone (UTC for stability). */
export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function pick<T>(arr: readonly T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}
