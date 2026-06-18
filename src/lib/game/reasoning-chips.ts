/**
 * Tap-to-build reasoning chips — derived from the visible setup so beginners
 * never face a blank essay. Selected labels are joined into the reasoning
 * string sent to the grader; free-type is optional.
 */
import type { DailyProblem } from "./types";

export interface ReasoningChip {
  id: string;
  label: string;
}

/** Always available — judgment / uncertainty, not extra "metrics." */
const JUDGMENT_CHIPS: ReasoningChip[] = [
  { id: "mixed", label: "Mixed signals" },
  { id: "falsifier", label: "Could reverse if trend breaks" },
  { id: "thin-edge", label: "Limited edge here" },
];

const SETUP_CHIP_CAP = 5; // leave room for judgment chips without crowding the row

function parsePct(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
}

/** Derive tappable chips from metrics + the anonymized series. */
export function chipsForProblem(problem: DailyProblem): ReasoningChip[] {
  const byLabel = Object.fromEntries(problem.metrics.map((m) => [m.label, m.value]));
  // The return label carries the visible window length ("6-month return", "2-month
  // return" in blind replay), so match it by substring rather than an exact key.
  const ret6m = parsePct(problem.metrics.find((m) => m.label.includes("return"))?.value ?? "0");
  const vol = parsePct(byLabel["Annualized volatility"] ?? "0");
  const dd = parsePct(byLabel["Max drawdown (window)"] ?? "0");
  const fromHigh = parsePct(byLabel["From window high"] ?? "0");
  const vsMa = parsePct(byLabel["Vs 50-day average"] ?? "0");

  const series = problem.series;
  const first = series[0]?.v ?? 100;
  const last = series[series.length - 1]?.v ?? 100;
  const trendUp = last >= first * 1.02;
  const trendDown = last <= first * 0.98;

  const out: ReasoningChip[] = [];

  if (trendUp || ret6m > 5) out.push({ id: "uptrend", label: "Uptrend" });
  if (trendDown || ret6m < -5) out.push({ id: "downtrend", label: "Downtrend" });
  if (Math.abs(ret6m) < 5) out.push({ id: "sideways", label: "Range-bound" });

  if (vsMa > 3) out.push({ id: "above-ma", label: "Above the 50-day" });
  if (vsMa < -3) out.push({ id: "below-ma", label: "Below the 50-day" });

  if (fromHigh > -3) out.push({ id: "near-highs", label: "Near the highs" });
  if (fromHigh < -15) out.push({ id: "off-highs", label: "Well off the highs" });

  if (vol >= 40) out.push({ id: "high-vol", label: "High volatility" });
  if (vol < 25) out.push({ id: "low-vol", label: "Low volatility" });

  if (dd < -20) out.push({ id: "big-dd", label: "Big drawdown" });

  if (vsMa > 8 && fromHigh > -5) out.push({ id: "overextended", label: "Overextended" });
  if (dd < -15 && ret6m > 0) out.push({ id: "recovering", label: "Recovering" });
  if (trendUp && fromHigh < -8) out.push({ id: "pullback", label: "Pullback from highs" });

  const seen = new Set<string>();
  const setup = out.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  }).slice(0, SETUP_CHIP_CAP);
  return [...setup, ...JUDGMENT_CHIPS];
}

/** Join chip labels + optional free text into the reasoning string. */
export function buildReasoning(chipLabels: string[], custom: string): string {
  const parts = chipLabels.filter(Boolean);
  const trimmed = custom.trim();
  if (trimmed) parts.push(trimmed);
  return parts.join(". ");
}

export function hasReasoning(chipLabels: string[], custom: string): boolean {
  return chipLabels.length > 0 || custom.trim().length > 0;
}
