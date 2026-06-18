/**
 * Client-side profile — rating, streak, and the journal of every call. Stored
 * in localStorage for v1 (no account needed to start). Cloud sync is a later
 * roadmap item; the shape here is deliberately server-friendly.
 */
import { START_RATING } from "@/lib/game/rating";
import { computeStreakUpdate, FREEZES_PER_WEEK } from "@/lib/game/streak";
import type { ConceptId } from "@/lib/game/concepts";

export interface JournalEntry {
  date: string;
  problemId: string;
  choice: "A" | "B" | "C";
  choiceLabel: string;
  confidence: number;
  reasoning: string;
  correct: boolean;
  brier: number;
  reasoningScore: number;
  reasoningNotes: string;
  ratingDelta: number;
  ratingAfter: number;
  earned: boolean;
  ticker: string;
  company: string;
  forwardReturnPct: number;
  /** problem difficulty 0–1, for per-difficulty insight detection (optional for older entries) */
  difficulty?: number;
  concepts?: ConceptId[];
}

export interface Profile {
  rating: number;
  gradedCount: number;
  streak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  /** streak freezes available this week (replenished weekly) */
  streakFreezes: number;
  freezeWeekKey: string | null;
  history: JournalEntry[];
}

const KEY = "hindsight.profile.v1";
const EVENT = "hindsight:profile";

export function emptyProfile(): Profile {
  return {
    rating: START_RATING,
    gradedCount: 0,
    streak: 0,
    longestStreak: 0,
    lastPlayedDate: null,
    streakFreezes: FREEZES_PER_WEEK,
    freezeWeekKey: null,
    history: [],
  };
}

/**
 * Stable reference for SSR + the useSyncExternalStore server snapshot. It must
 * keep the same identity across calls, or React loops re-rendering.
 */
export const SERVER_PROFILE: Profile = emptyProfile();

// Snapshot cache: useSyncExternalStore requires getSnapshot to return the SAME
// reference until the underlying data actually changes. Re-parsing localStorage
// into a fresh object on every call would loop forever, so we cache by raw string.
let cachedProfile: Profile = SERVER_PROFILE;
let cachedRaw: string | null = null;
let cacheInit = false;

export function loadProfile(): Profile {
  if (typeof window === "undefined") return SERVER_PROFILE;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (cacheInit && raw === cachedRaw) return cachedProfile;
  cachedRaw = raw;
  cacheInit = true;
  try {
    cachedProfile = raw ? { ...emptyProfile(), ...(JSON.parse(raw) as Profile) } : emptyProfile();
  } catch {
    cachedProfile = emptyProfile();
  }
  return cachedProfile;
}

function save(p: Profile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Has the player already solved today's problem? */
export function hasPlayed(p: Profile, dateKey: string): boolean {
  return p.history.some((h) => h.date === dateKey);
}

/** Record a graded call, updating rating + streak. Idempotent per date. */
export function recordResult(entry: JournalEntry): Profile {
  const p = loadProfile();
  if (hasPlayed(p, entry.date)) return p;

  const streakUpdate = computeStreakUpdate({
    lastPlayedDate: p.lastPlayedDate,
    currentStreak: p.streak,
    playDate: entry.date,
    streakFreezes: p.streakFreezes ?? FREEZES_PER_WEEK,
    freezeWeekKey: p.freezeWeekKey ?? null,
  });

  const next: Profile = {
    rating: entry.ratingAfter,
    gradedCount: p.gradedCount + 1,
    streak: streakUpdate.streak,
    longestStreak: Math.max(p.longestStreak, streakUpdate.streak),
    lastPlayedDate: entry.date,
    streakFreezes: streakUpdate.streakFreezes,
    freezeWeekKey: streakUpdate.freezeWeekKey,
    history: [entry, ...p.history].slice(0, 365),
  };
  save(next);
  return next;
}

/** Practice call — updates rating + journal but not streak or daily last-played. */
export function recordPracticeResult(entry: JournalEntry): Profile {
  const p = loadProfile();
  if (p.history.some((h) => h.problemId === entry.problemId)) return p;

  const next: Profile = {
    rating: entry.ratingAfter,
    gradedCount: p.gradedCount + 1,
    streak: p.streak,
    longestStreak: p.longestStreak,
    lastPlayedDate: p.lastPlayedDate,
    streakFreezes: p.streakFreezes ?? FREEZES_PER_WEEK,
    freezeWeekKey: p.freezeWeekKey ?? null,
    history: [entry, ...p.history].slice(0, 365),
  };
  save(next);
  return next;
}

export function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export { EVENT };
