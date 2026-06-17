import { describe, expect, it } from "vitest";
import { verdict, skillTrend, insights } from "./progress";
import type { JournalEntry } from "@/lib/profile/store";

function entry(partial: Partial<JournalEntry> & Pick<JournalEntry, "date">): JournalEntry {
  return {
    problemId: partial.problemId ?? `p-${partial.date}`,
    choice: "A",
    choiceLabel: "Up",
    confidence: 0.7,
    reasoning: "test",
    correct: true,
    brier: 0.09,
    reasoningScore: 0.6,
    reasoningNotes: "",
    ratingDelta: 10,
    ratingAfter: 1010,
    earned: true,
    ticker: "X",
    company: "Co",
    forwardReturnPct: 12,
    ...partial,
  };
}

describe("progress", () => {
  it("labels lucky wins", () => {
    const v = verdict({ correct: true, earned: false, brier: 0.1, reasoning: 0.2 });
    expect(v.badge).toContain("LUCKY");
  });

  it("detects improving trend with enough history", () => {
    const history: JournalEntry[] = [];
    for (let i = 0; i < 8; i++) {
      history.unshift(entry({
        date: `2026-06-${String(i + 1).padStart(2, "0")}`,
        brier: i < 4 ? 0.2 : 0.05,
        reasoningScore: i < 4 ? 0.4 : 0.75,
      }));
    }
    const t = skillTrend(history);
    expect(t.enough).toBe(true);
    expect(t.verdict).toBe("improving");
  });

  it("surfaces overconfidence leak", () => {
    const history = Array.from({ length: 5 }, (_, i) => entry({
      date: `2026-06-0${i + 1}`,
      confidence: 0.9,
      correct: i % 2 === 0,
      brier: 0.3,
    }));
    const tips = insights(history);
    expect(tips.some((t) => t.title.includes("overconfident"))).toBe(true);
  });
});
