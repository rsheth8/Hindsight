import { describe, expect, it } from "vitest";
import { computeStreakUpdate, FREEZES_PER_WEEK } from "./streak";

describe("streak", () => {
  it("extends streak on consecutive days", () => {
    const r = computeStreakUpdate({
      lastPlayedDate: "2026-06-15",
      currentStreak: 3,
      playDate: "2026-06-16",
      streakFreezes: 1,
      freezeWeekKey: null,
    });
    expect(r.streak).toBe(4);
    expect(r.usedFreeze).toBe(false);
  });

  it("uses freeze when exactly one day missed", () => {
    const r = computeStreakUpdate({
      lastPlayedDate: "2026-06-14",
      currentStreak: 5,
      playDate: "2026-06-16",
      streakFreezes: 1,
      freezeWeekKey: "2026-W24",
    });
    expect(r.streak).toBe(6);
    expect(r.usedFreeze).toBe(true);
    expect(r.streakFreezes).toBe(0);
  });

  it("resets streak after multi-day gap without freeze", () => {
    const r = computeStreakUpdate({
      lastPlayedDate: "2026-06-10",
      currentStreak: 5,
      playDate: "2026-06-16",
      streakFreezes: 0,
      freezeWeekKey: null,
    });
    expect(r.streak).toBe(1);
  });

  it("replenishes freezes on new week", () => {
    const r = computeStreakUpdate({
      lastPlayedDate: null,
      currentStreak: 0,
      playDate: "2026-06-16",
      streakFreezes: 0,
      freezeWeekKey: "2026-W20",
    });
    expect(r.streakFreezes).toBe(FREEZES_PER_WEEK);
  });
});
