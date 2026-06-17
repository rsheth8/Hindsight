/**
 * Personal bests & weekly stats — local Rank tab content until global leagues ship.
 */
import type { JournalEntry } from "@/lib/profile/store";
import { todayKey } from "./seed";

export interface PersonalBests {
  longestStreak: number;
  earnedWins: number;
  bestRatingDelta: number;
  bestWeekCalibration: number | null;
  thisWeekCalibration: number | null;
  thisWeekCalls: number;
  weekLabel: string;
}

function calibScore(brier: number): number {
  return Math.round(Math.max(0, Math.min(100, ((0.25 - brier) / 0.25) * 100)));
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekCalibration(entries: JournalEntry[]): number | null {
  if (entries.length === 0) return null;
  const avg = entries.reduce((a, h) => a + calibScore(h.brier), 0) / entries.length;
  return Math.round(avg);
}

/** Daily calls only — practice excluded from weekly calibration board. */
function isDailyEntry(h: JournalEntry): boolean {
  return !h.problemId.startsWith("practice");
}

export function personalBests(history: JournalEntry[], longestStreak: number): PersonalBests {
  const daily = history.filter(isDailyEntry);
  const earnedWins = history.filter((h) => h.earned).length;
  const bestRatingDelta = history.length ? Math.max(...history.map((h) => h.ratingDelta)) : 0;

  const byWeek = new Map<string, JournalEntry[]>();
  for (const h of daily) {
    const wk = isoWeekKey(h.date);
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk)!.push(h);
  }

  let bestWeekCalibration: number | null = null;
  for (const entries of byWeek.values()) {
    const s = weekCalibration(entries);
    if (s !== null && (bestWeekCalibration === null || s > bestWeekCalibration)) {
      bestWeekCalibration = s;
    }
  }

  const thisWk = isoWeekKey(todayKey());
  const thisWeekEntries = byWeek.get(thisWk) ?? [];

  return {
    longestStreak,
    earnedWins,
    bestRatingDelta,
    bestWeekCalibration,
    thisWeekCalibration: weekCalibration(thisWeekEntries),
    thisWeekCalls: thisWeekEntries.length,
    weekLabel: thisWk,
  };
}

export function tierFromRating(rating: number): { name: string; emoji: string; next: number } {
  if (rating >= 1400) return { name: "Oracle", emoji: "🔮", next: 1600 };
  if (rating >= 1200) return { name: "Sharp", emoji: "💎", next: 1400 };
  if (rating >= 1050) return { name: "Calibrated", emoji: "🎯", next: 1200 };
  return { name: "Coin-Flip", emoji: "🪙", next: 1050 };
}
