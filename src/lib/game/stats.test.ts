import { describe, expect, it } from "vitest";
import { personalBests, tierFromRating } from "./stats";
import type { JournalEntry } from "@/lib/profile/store";

function entry(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    date: "2026-06-17",
    problemId: "bank-2026-06-17-X",
    choice: "A",
    choiceLabel: "Up",
    confidence: 0.7,
    reasoning: "Uptrend",
    correct: true,
    brier: 0.09,
    reasoningScore: 0.7,
    reasoningNotes: "ok",
    ratingDelta: 12,
    ratingAfter: 1012,
    earned: true,
    ticker: "X",
    company: "X Co",
    forwardReturnPct: 12,
    ...overrides,
  };
}

describe("stats", () => {
  it("tier boundaries", () => {
    expect(tierFromRating(1049).name).toBe("Coin-Flip");
    expect(tierFromRating(1050).name).toBe("Calibrated");
    expect(tierFromRating(1200).name).toBe("Sharp");
    expect(tierFromRating(1400).name).toBe("Oracle");
  });

  it("excludes practice from weekly calibration but includes blind", () => {
    const history = [
      entry({ date: "2026-06-17", problemId: "bank-daily", brier: 0.04 }),
      entry({ date: "2026-06-17", problemId: "practice-seed", brier: 0.9 }),
      entry({ date: "2026-06-17", problemId: "blind-seed", brier: 0.05 }),
    ];
    const b = personalBests(history, 3);
    expect(b.thisWeekCalls).toBe(2);
    expect(b.thisWeekCalibration).toBeGreaterThan(50);
  });

  it("empty history returns safe defaults", () => {
    const b = personalBests([], 0);
    expect(b.bestRatingDelta).toBe(0);
    expect(b.thisWeekCalls).toBe(0);
    expect(b.thisWeekCalibration).toBeNull();
  });

  it("counts earned wins across all entry types", () => {
    const history = [
      entry({ earned: true }),
      entry({ earned: false, problemId: "practice-x" }),
    ];
    expect(personalBests(history, 1).earnedWins).toBe(1);
  });
});
