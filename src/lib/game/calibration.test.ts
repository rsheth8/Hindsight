import { describe, expect, it } from "vitest";
import {
  brierFor,
  calibrationCredit,
  calibrationSkill,
  GUESS_CONFIDENCE,
  REFERENCE_BRIER,
  summarize,
} from "./calibration";

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
    const calls = Array.from({ length: 12 }, () => ({ confidence: 0.85, correct: true }));
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

  it("uses the 3-outcome base rate as the no-skill reference", () => {
    // a pure guess among 3 choices is right 1/3 of the time
    expect(GUESS_CONFIDENCE).toBeCloseTo(1 / 3, 10);
    // Brier of always forecasting the base rate = variance p(1-p) = 2/9
    expect(REFERENCE_BRIER).toBeCloseTo(2 / 9, 10);
  });

  it("skill score is 1 at perfect, 0 at the guessing baseline", () => {
    expect(calibrationSkill(0)).toBe(1);
    expect(calibrationSkill(REFERENCE_BRIER)).toBeCloseTo(0, 10);
    expect(calibrationSkill(1)).toBe(0); // clamped, never negative
  });

  it("rating credit is 1 at perfect, 0.5 at the guessing baseline", () => {
    expect(calibrationCredit(0)).toBe(1);
    expect(calibrationCredit(REFERENCE_BRIER)).toBeCloseTo(0.5, 10);
    expect(calibrationCredit(2 * REFERENCE_BRIER)).toBeCloseTo(0, 10);
  });
});
