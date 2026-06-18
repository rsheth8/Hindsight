import { describe, expect, it } from "vitest";
import { FREEZES_PER_WEEK, isoWeekKey, dayGap, computeStreakUpdate } from "./streak";

describe("streak", () => {
  it("increments on consecutive days", () => {
    const u = computeStreakUpdate({
      lastPlayedDate: "2026-06-16",
      currentStreak: 3,
      playDate: "2026-06-17",
      streakFreezes: 1,
      freezeWeekKey: null,
    });
    expect(u.streak).toBe(4);
    expect(u.usedFreeze).toBe(false);
  });

  it("uses freeze on exactly one missed day", () => {
    const u = computeStreakUpdate({
      lastPlayedDate: "2026-06-15",
      currentStreak: 5,
      playDate: "2026-06-17",
      streakFreezes: 1,
      freezeWeekKey: isoWeekKey("2026-06-15"),
    });
    expect(u.streak).toBe(6);
    expect(u.usedFreeze).toBe(true);
    expect(u.streakFreezes).toBe(0);
  });

  it("resets after gap > 1 without freeze", () => {
    const u = computeStreakUpdate({
      lastPlayedDate: "2026-06-14",
      currentStreak: 5,
      playDate: "2026-06-17",
      streakFreezes: 0,
      freezeWeekKey: null,
    });
    expect(u.streak).toBe(1);
  });

  it("replenishes freezes on new ISO week", () => {
    const u = computeStreakUpdate({
      lastPlayedDate: "2026-06-07",
      currentStreak: 2,
      playDate: "2026-06-17",
      streakFreezes: 0,
      freezeWeekKey: "2026-W22",
    });
    expect(u.streakFreezes).toBe(FREEZES_PER_WEEK);
  });

  it("same-day replay preserves streak", () => {
    const u = computeStreakUpdate({
      lastPlayedDate: "2026-06-17",
      currentStreak: 7,
      playDate: "2026-06-17",
      streakFreezes: 1,
      freezeWeekKey: isoWeekKey("2026-06-17"),
    });
    expect(u.streak).toBe(7);
  });

  it("dayGap counts UTC calendar days", () => {
    expect(dayGap("2026-06-01", "2026-06-03")).toBe(2);
    expect(dayGap("2026-06-01", "2026-06-01")).toBe(0);
  });

  it("isoWeekKey is stable for mid-year dates", () => {
    expect(isoWeekKey("2026-06-17")).toMatch(/^2026-W\d{2}$/);
  });
});
