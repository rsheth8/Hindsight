import { describe, expect, it } from "vitest";
import { detectNewMilestones, milestone } from "./milestones";
import { emptyProfile } from "@/lib/profile/store";

describe("milestones", () => {
  it("detects first call", () => {
    const before = emptyProfile();
    const after = { ...before, gradedCount: 1, history: [{ date: "2026-06-18" } as never] };
    const ms = detectNewMilestones(before, after);
    expect(ms.map((m) => m.id)).toContain("first-call");
  });

  it("detects provisional graduation at 10 calls", () => {
    const before = { ...emptyProfile(), gradedCount: 9 };
    const after = { ...before, gradedCount: 10, rating: 1050 };
    const ms = detectNewMilestones(before, after);
    expect(ms.map((m) => m.id)).toContain("provisional-graduate");
  });

  it("milestone copy has emoji", () => {
    expect(milestone("streak-7").emoji).toBeTruthy();
  });
});
