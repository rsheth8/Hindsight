import { describe, expect, it } from "vitest";
import { conceptsForProblem, conceptsForEntry, conceptMastery } from "./concepts";
import { mockDailyProblem } from "@/test/fixtures/problem";
import type { JournalEntry } from "@/lib/profile/store";

describe("concepts", () => {
  it("always includes sizing on problems", () => {
    const tags = conceptsForProblem(mockDailyProblem());
    expect(tags).toContain("sizing");
  });

  it("tags high volatility setups", () => {
    const p = mockDailyProblem({
      metrics: [
        { label: "6-month return", value: "+5%" },
        { label: "Annualized volatility", value: "40%" },
        { label: "Max drawdown (window)", value: "-10%" },
        { label: "From window high", value: "-5%" },
        { label: "Vs 50-day average", value: "+2%" },
      ],
    });
    expect(conceptsForProblem(p)).toContain("volatility");
  });

  it("prefers stored concepts on journal entries", () => {
    const e = { concepts: ["reversal" as const] } as JournalEntry;
    expect(conceptsForEntry(e)).toEqual(["reversal"]);
  });

  it("conceptMastery sharp level needs score and calls", () => {
    const rows: JournalEntry[] = Array.from({ length: 5 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, "0")}`,
      problemId: `p-${i}`,
      choice: "A" as const,
      choiceLabel: "Up",
      confidence: 0.75,
      reasoning: "trend momentum however risk",
      correct: true,
      brier: 0.05,
      reasoningScore: 0.85,
      reasoningNotes: "",
      ratingDelta: 10,
      ratingAfter: 1010,
      earned: true,
      ticker: "T",
      company: "T",
      forwardReturnPct: 12,
      concepts: ["sizing" as const],
    }));
    const m = conceptMastery(rows).find((c) => c.id === "sizing")!;
    expect(m.calls).toBe(5);
    expect(m.level).toBe("sharp");
  });
});
