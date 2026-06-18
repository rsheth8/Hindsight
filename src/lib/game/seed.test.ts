import { describe, expect, it } from "vitest";
import { hashSeed, rng, todayKey, pick } from "./seed";

describe("seed", () => {
  it("hashSeed is deterministic", () => {
    expect(hashSeed("2026-06-17")).toBe(hashSeed("2026-06-17"));
    expect(hashSeed("a")).not.toBe(hashSeed("b"));
  });

  it("rng produces identical sequences for same seed", () => {
    const a = rng(12345);
    const b = rng(12345);
    const seqA = [a(), a(), a()];
    const b2 = rng(12345);
    expect([b(), b(), b()]).toEqual(seqA);
    expect([b2(), b2(), b2()]).toEqual(seqA);
  });

  it("todayKey uses UTC date", () => {
    expect(todayKey(new Date("2026-06-17T23:00:00Z"))).toBe("2026-06-17");
  });

  it("pick returns the only element for length-1 array", () => {
    expect(pick(["only"] as const, rng(1))).toBe("only");
  });
});
