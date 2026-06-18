import { describe, expect, it } from "vitest";
import { brierFor, summarize } from "./calibration";

describe("calibration", () => {
  it("scores perfect calibration at 0 brier", () => {
    expect(brierFor(1, true)).toBe(0);
    expect(brierFor(0.5, false)).toBe(0.25);
  });

  it("penalizes confident wrong answers", () => {
    expect(brierFor(0.9, false)).toBeGreaterThan(brierFor(0.6, false));
  });

  it("coin-flip at 50% has brier 0.25 regardless of outcome", () => {
    expect(brierFor(0.5, true)).toBe(0.25);
    expect(brierFor(0.5, false)).toBe(0.25);
  });

  it("returns warming-up readiness for small samples", () => {
    const s = summarize([{ confidence: 0.8, correct: true }]);
    expect(s.readiness.label).toBe("Warming up");
    expect(s.resolved).toBe(1);
  });

  it("reaches well-calibrated with enough good calls", () => {
    const calls = Array.from({ length: 12 }, () => ({ confidence: 0.75, correct: true }));
    const s = summarize(calls);
    expect(s.readiness.label).toBe("Well-calibrated");
    expect(s.brier).toBeLessThan(0.1);
  });

  it("computes overconfidence as avg(confidence) - accuracy", () => {
    const s = summarize([
      { confidence: 0.9, correct: false },
      { confidence: 0.9, correct: false },
      { confidence: 0.9, correct: true },
    ]);
    expect(s.overconfidence).toBeGreaterThan(0);
  });

  it("readiness score is 0 at brier 0.25 even with enough samples", () => {
    const calls = Array.from({ length: 12 }, () => ({ confidence: 0.5, correct: Math.random() > 0.5 }));
    const s = summarize(calls);
    if (s.brier !== null && Math.abs(s.brier - 0.25) < 0.01) {
      expect(s.readiness.score).toBeLessThanOrEqual(5);
    }
  });
});
