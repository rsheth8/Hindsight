import { describe, expect, it } from "vitest";
import { skillScore, updateRating, provisionalReasoningFloor, START_RATING } from "./rating";

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

  it("floors reasoning during provisional grace period", () => {
    expect(provisionalReasoningFloor(5, 0.2)).toBe(0.5);
    expect(provisionalReasoningFloor(10, 0.2)).toBe(0.2);
  });

  it("rewards good calibration even when wrong", () => {
    const s = skillScore({ correct: false, brier: 0.04, reasoning: 0.5 });
    expect(s).toBeGreaterThan(0.4);
  });
});
