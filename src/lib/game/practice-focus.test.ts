import { describe, expect, it } from "vitest";
import { derivePracticeFocus, focusLabel } from "./practice-focus";
import type { JournalEntry } from "@/lib/profile/store";

function entry(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    date: "2026-06-17",
    problemId: "bank-x",
    choice: "A",
    choiceLabel: "Up",
    confidence: 0.85,
    reasoning: "trend",
    correct: false,
    brier: 0.72,
    reasoningScore: 0.5,
    reasoningNotes: "",
    ratingDelta: -5,
    ratingAfter: 995,
    earned: false,
    ticker: "X",
    company: "X",
    forwardReturnPct: 5,
    difficulty: 0.75,
    ...overrides,
  };
}

describe("practice-focus", () => {
  it("returns mixed for short history", () => {
    expect(derivePracticeFocus([entry({})])).toBe("mixed");
  });

  it("targets boundary when overconfident", () => {
    const history = Array.from({ length: 6 }, (_, i) =>
      entry({ date: `2026-06-${String(i + 1).padStart(2, "0")}`, confidence: 0.9, correct: false, brier: 0.81 }),
    );
    expect(derivePracticeFocus(history)).toBe("boundary");
  });

  it("focusLabel returns human-readable string", () => {
    expect(focusLabel("hard")).toBe("hard setups");
    expect(focusLabel("mixed")).toBe("a mixed bag");
  });
});
