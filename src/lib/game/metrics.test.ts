import { describe, expect, it } from "vitest";
import { computeMetrics, estimateDifficulty, type Bar } from "./metrics";

function flatBars(n: number, price = 100): Bar[] {
  return Array.from({ length: n }, (_, i) => ({ date: `2024-01-${String(i + 1).padStart(2, "0")}`, close: price }));
}

function risingBars(n: number): Bar[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}`,
    close: 100 + i * 0.5,
  }));
}

describe("metrics", () => {
  it("flat prices → ~0 vol and 0% return", () => {
    const m = computeMetrics(flatBars(60));
    expect(m.find((x) => x.label.includes("return"))!.value).toMatch(/\+?0\.0%/);
    expect(parseFloat(m.find((x) => x.label.includes("volatility"))!.value)).toBeLessThan(5);
  });

  it("rising series has positive 6-month return", () => {
    const m = computeMetrics(risingBars(80));
    const ret = parseFloat(m[0].value);
    expect(ret).toBeGreaterThan(0);
  });

  it("estimateDifficulty peaks near ±10% boundaries", () => {
    const nearBoundary = estimateDifficulty(9, 30);
    const farAway = estimateDifficulty(25, 30);
    expect(nearBoundary).toBeGreaterThan(farAway);
  });

  it("computeMetrics on short series does not throw", () => {
    expect(() => computeMetrics(flatBars(2))).not.toThrow();
  });

  it("difficulty stays in [0.15, 0.95]", () => {
    for (const fwd of [-20, 0, 10, 30]) {
      const d = estimateDifficulty(fwd, 40);
      expect(d).toBeGreaterThanOrEqual(0.15);
      expect(d).toBeLessThanOrEqual(0.95);
    }
  });
});
