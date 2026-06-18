import { describe, expect, it } from "vitest";
import { buildProblemForSeed } from "./daily";
import { FALLBACK_BANK } from "./fallback";

describe("daily", () => {
  it("buildProblemForSeed uses fallback without FMP key", async () => {
    const p = await buildProblemForSeed("2026-06-17");
    expect(p.live).toBe(false);
    expect(p.id.startsWith("bank-")).toBe(true);
  });

  it("same seed produces same problem", async () => {
    const a = await buildProblemForSeed("fixed-seed-123");
    const b = await buildProblemForSeed("fixed-seed-123");
    expect(a.id).toBe(b.id);
    expect(a.answer).toBe(b.answer);
  });

  it("fallback bank entries have valid answer vs forward return", () => {
    for (const entry of FALLBACK_BANK) {
      const fwd = entry.reveal.forwardReturnPct;
      let expected: "A" | "B" | "C";
      if (fwd > 10) expected = "A";
      else if (fwd < -10) expected = "C";
      else expected = "B";
      expect(entry.answer).toBe(expected);
    }
  });

  it("problem includes required client fields", async () => {
    const p = await buildProblemForSeed("shape-check");
    expect(p.series.length).toBeGreaterThan(10);
    expect(p.metrics.length).toBeGreaterThan(0);
    expect(p.choices).toHaveLength(3);
    expect(p.reveal.ticker).toBeTruthy();
  });
});
