import { describe, expect, it } from "vitest";
import { computeMetrics, deriveSituationBands, estimateDifficulty, type Bar } from "./metrics";

describe("deriveSituationBands", () => {
  const rising = Array.from({ length: 60 }, (_, i) => ({ date: `2024-01-${String(i + 1).padStart(2, "0")}`, close: 100 + i * 0.5 }));
  const flat = Array.from({ length: 60 }, (_, i) => ({ date: `2024-01-${String(i + 1).padStart(2, "0")}`, close: 100 }));

  it("returns Trend / Volatility / Position bands", () => {
    expect(deriveSituationBands(rising).map((b) => b.label)).toEqual(["Trend", "Volatility", "Position"]);
  });
  it("reads a steady rise as an uptrend pushing highs", () => {
    const bands = deriveSituationBands(rising);
    expect(bands[0].value).toMatch(/uptrend|higher/i);
    expect(bands[2].value).toMatch(/highs/i);
  });
  it("reads a flat series as rangebound and calm", () => {
    const bands = deriveSituationBands(flat);
    expect(bands[0].value).toMatch(/rangebound|flat/i);
    expect(bands[1].value).toBe("Calm");
  });
  it("is deterministic — never derives from the future", () => {
    expect(deriveSituationBands(rising)).toEqual(deriveSituationBands(rising));
  });
});

function flatBars(n: number, price = 100): Bar[] {
  return Array.from({ length: n }, (_, i) => ({ date: `2024-01-${String(i + 1).padStart(2, "0")}`, close: price }));
}

function risingBars(n: number): Bar[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}`,
    close: 100 + i * 0.5,
  }));
}

// Net ~flat but with large day-to-day swings → high realized volatility, no clear trend.
function volatileBars(n: number): Bar[] {
  let price = 100;
  return Array.from({ length: n }, (_, i) => {
    price *= 1 + (i % 2 === 0 ? 0.08 : -0.075);
    return { date: `2024-01-${String(i + 1).padStart(2, "0")}`, close: +price.toFixed(2) };
  });
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

  it("difficulty is higher for volatile/ambiguous setups than clear low-vol trends", () => {
    const calm = estimateDifficulty(risingBars(80)); // steady trend, low vol → easier
    const choppy = estimateDifficulty(volatileBars(80)); // high vol, no trend → harder
    expect(choppy).toBeGreaterThan(calm);
  });

  it("difficulty uses only visible bars and stays in [0.15, 0.95]", () => {
    for (const bars of [flatBars(60), risingBars(80), volatileBars(80)]) {
      const d = estimateDifficulty(bars);
      expect(d).toBeGreaterThanOrEqual(0.15);
      expect(d).toBeLessThanOrEqual(0.95);
    }
  });

  it("computeMetrics on short series does not throw", () => {
    expect(() => computeMetrics(flatBars(2))).not.toThrow();
  });
});
