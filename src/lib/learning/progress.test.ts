import { describe, expect, it } from "vitest";
import { completeStep, isUnitUnlocked, pathSummary } from "@/lib/learning/progress";
import { emptyProfile } from "@/lib/profile/store";
import { LEARNING_UNITS } from "@/lib/learning/path";

describe("learning progress", () => {
  it("first unit is always unlocked", () => {
    const p = emptyProfile();
    expect(isUnitUnlocked(p, LEARNING_UNITS[0]!)).toBe(true);
  });

  it("completing a step adds xp", () => {
    const p = emptyProfile();
    const unit = LEARNING_UNITS[0]!;
    const { progress } = completeStep(p, unit.id, unit.steps[0]!.id);
    expect(progress.xp).toBeGreaterThan(0);
  });

  it("path summary tracks units", () => {
    const s = pathSummary(emptyProfile());
    expect(s.total).toBe(LEARNING_UNITS.length);
  });
});
