/**
 * Blind replay — reveal the chart week-by-week, then make the same forward call.
 * Server holds the full problem; client only sees `visibleDays` of history.
 */
import { computeMetrics, type Bar } from "./metrics";
import { getPracticeProblem, type PracticeFocus } from "./practice";
import type { DailyProblem, PricepointLite, SolvedProblem } from "./types";

export const BLIND_START_DAYS = 42;
export const BLIND_STEP_DAYS = 7;
export const BLIND_MAX_DAYS = 126;

function liteToBars(series: PricepointLite[]): Bar[] {
  return series.map((p, i) => ({ date: `t-${i}`, close: p.v }));
}

function truncateProblem(problem: SolvedProblem, visibleDays: number): DailyProblem {
  const cap = Math.max(BLIND_START_DAYS, Math.min(BLIND_MAX_DAYS, visibleDays));
  const series = problem.series.slice(0, cap);
  const metrics = computeMetrics(liteToBars(series));
  const { answer: _a, reveal: _r, ...rest } = problem;
  void _a;
  void _r;
  return {
    ...rest,
    type: "read-the-setup",
    series,
    metrics,
    prompt: "You've been watching this setup unfold. Over the next 3 months, it most likely…",
  };
}

export async function getBlindReplayProblem(
  seedKey: string,
  focus: PracticeFocus,
  visibleDays: number = BLIND_START_DAYS,
): Promise<{ client: DailyProblem; visibleDays: number; maxDays: number }> {
  const full = await getPracticeProblem(`blind-${seedKey}`, focus);
  const visible = Math.max(BLIND_START_DAYS, Math.min(BLIND_MAX_DAYS, visibleDays));
  return {
    client: { ...truncateProblem(full, visible), id: `blind-${full.id}`, date: seedKey },
    visibleDays: visible,
    maxDays: full.series.length,
  };
}

export async function resolveBlindProblem(
  seedKey: string,
  focus: PracticeFocus,
  visibleDays: number,
): Promise<SolvedProblem> {
  const full = await getPracticeProblem(`blind-${seedKey}`, focus);
  return full;
}
