import { describe, expect, it } from "vitest";
import {
  kFactor,
  difficultyToElo,
  skillScore,
  updateRating,
  provisionalReasoningFloor,
  isProvisional,
  START_RATING,
} from "./rating";

describe("rating", () => {
  it("clamps lucky wins when reasoning is thin", () => {
    const thin = updateRating({
      rating: START_RATING,
      gradedCount: 20,
      difficulty: 0.5,
      inputs: { correct: true, brier: 0.1, reasoning: 0.2 },
    });
    const solid = updateRating({
      rating: START_RATING,
      gradedCount: 20,
      difficulty: 0.5,
      inputs: { correct: true, brier: 0.1, reasoning: 0.8 },
    });
    expect(solid.delta).toBeGreaterThan(thin.delta);
  });

  it("luck filter boundary: reasoning 0.39 vs 0.41 on correct calls", () => {
    const low = skillScore({ correct: true, brier: 0.05, reasoning: 0.39 });
    const high = skillScore({ correct: true, brier: 0.05, reasoning: 0.41 });
    expect(high).toBeGreaterThan(low);
  });

  it("floors reasoning during provisional grace period", () => {
    expect(provisionalReasoningFloor(5, 0.2)).toBe(0.5);
    expect(provisionalReasoningFloor(10, 0.2)).toBe(0.2);
  });

  it("provisional player with thin reasoning still gets non-negative delta when calibrated", () => {
    const u = updateRating({
      rating: START_RATING,
      gradedCount: 3,
      difficulty: 0.4,
      inputs: { correct: true, brier: 0.04, reasoning: 0.15 },
    });
    expect(u.delta).toBeGreaterThanOrEqual(0);
  });

  it("rewards good calibration even when wrong", () => {
    const s = skillScore({ correct: false, brier: 0.04, reasoning: 0.5 });
    expect(s).toBeGreaterThan(0.4);
  });

  it("earned only when correct and reasoning >= 0.5", () => {
    expect(updateRating({
      rating: 1000, gradedCount: 20, difficulty: 0.5,
      inputs: { correct: true, brier: 0.1, reasoning: 0.6 },
    }).earned).toBe(true);
    expect(updateRating({
      rating: 1000, gradedCount: 20, difficulty: 0.5,
      inputs: { correct: true, brier: 0.1, reasoning: 0.4 },
    }).earned).toBe(false);
  });

  it("newRating never drops below 100", () => {
    const u = updateRating({
      rating: 105,
      gradedCount: 50,
      difficulty: 0.95,
      inputs: { correct: false, brier: 0.9, reasoning: 0.1 },
    });
    expect(u.newRating).toBeGreaterThanOrEqual(100);
  });

  it("kFactor shrinks with track record", () => {
    expect(kFactor(5)).toBeGreaterThan(kFactor(15));
    expect(kFactor(15)).toBeGreaterThan(kFactor(40));
  });

  it("difficultyToElo maps 0→600 and 1→2200", () => {
    expect(difficultyToElo(0)).toBe(600);
    expect(difficultyToElo(1)).toBe(2200);
    expect(difficultyToElo(-1)).toBe(600);
    expect(difficultyToElo(2)).toBe(2200);
  });

  it("isProvisional under 10 graded calls", () => {
    expect(isProvisional(9)).toBe(true);
    expect(isProvisional(10)).toBe(false);
  });
});
