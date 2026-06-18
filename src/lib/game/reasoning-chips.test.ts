import { describe, expect, it } from "vitest";
import { buildReasoning, chipsForProblem, hasReasoning } from "./reasoning-chips";
import { mockDailyProblem, mockSeries } from "@/test/fixtures/problem";

describe("reasoning-chips", () => {
  it("buildReasoning joins chips and custom text", () => {
    expect(buildReasoning(["Uptrend", "Above the 50-day"], "volume confirms")).toBe(
      "Uptrend. Above the 50-day. volume confirms",
    );
  });

  it("hasReasoning rejects empty chip list and whitespace-only custom", () => {
    expect(hasReasoning([], "  ")).toBe(false);
    expect(hasReasoning([], "note")).toBe(true);
    expect(hasReasoning(["Uptrend"], "")).toBe(true);
  });

  it("emits uptrend chip when series rises >= 2%", () => {
    const series = mockSeries(10);
    const problem = mockDailyProblem({ series, metrics: [
      { label: "6-month return", value: "+15.0%" },
      { label: "Annualized volatility", value: "20%" },
      { label: "Max drawdown (window)", value: "-5.0%" },
      { label: "From window high", value: "-1.0%" },
      { label: "Vs 50-day average", value: "+8.0%" },
    ]});
    const labels = chipsForProblem(problem).map((c) => c.label);
    expect(labels).toContain("Uptrend");
  });

  it("caps setup chips and always includes judgment chips", () => {
    const problem = mockDailyProblem({
      metrics: [
        { label: "6-month return", value: "+20.0%" },
        { label: "Annualized volatility", value: "45%" },
        { label: "Max drawdown (window)", value: "-25.0%" },
        { label: "From window high", value: "-1.0%" },
        { label: "Vs 50-day average", value: "+12.0%" },
      ],
    });
    const labels = chipsForProblem(problem).map((c) => c.label);
    expect(labels.length).toBeLessThanOrEqual(8);
    expect(labels).toContain("Mixed signals");
    expect(labels).toContain("Could reverse if trend breaks");
    expect(labels).toContain("Limited edge here");
  });

  it("handles missing metrics without throwing", () => {
    const problem = mockDailyProblem({ metrics: [] });
    expect(() => chipsForProblem(problem)).not.toThrow();
  });
});
