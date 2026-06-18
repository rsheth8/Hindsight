import type { ChoiceId, DailyProblem, SolvedProblem } from "@/lib/game/types";

const CHOICES = [
  { id: "A" as ChoiceId, label: "Gained more than 10%" },
  { id: "B" as ChoiceId, label: "Stayed within ±10%" },
  { id: "C" as ChoiceId, label: "Fell more than 10%" },
];

/** Minimal indexed series — uptrend from 100 → 115 */
export function mockSeries(len = 20): DailyProblem["series"] {
  return Array.from({ length: len }, (_, i) => ({
    t: i,
    v: +(100 + (15 * i) / Math.max(1, len - 1)).toFixed(2),
  }));
}

export function mockMetrics(overrides: Partial<Record<string, string>> = {}) {
  return [
    { label: "6-month return", value: overrides.ret6m ?? "+12.0%" },
    { label: "Annualized volatility", value: overrides.vol ?? "28%" },
    { label: "Max drawdown (window)", value: overrides.dd ?? "-8.0%" },
    { label: "From window high", value: overrides.fromHigh ?? "-2.0%" },
    { label: "Vs 50-day average", value: overrides.vsMa ?? "+6.0%" },
  ];
}

export function mockSolvedProblem(overrides: Partial<SolvedProblem> = {}): SolvedProblem {
  const series = overrides.series ?? mockSeries();
  return {
    id: "test-problem-1",
    date: "2026-06-17",
    type: "read-the-setup",
    series,
    metrics: overrides.metrics ?? mockMetrics(),
    prompt: "Over the next 3 months, this stock most likely…",
    choices: CHOICES,
    horizonLabel: "3 months",
    difficulty: 0.5,
    crowd: { A: 35, B: 40, C: 25 },
    live: false,
    answer: "A",
    reveal: {
      ticker: "TEST",
      company: "Test Co",
      decisionDate: "2024-01-15",
      resolveDate: "2024-04-15",
      forwardReturnPct: 14.2,
      continuation: mockSeries(10),
    },
    ...overrides,
  };
}

export function mockDailyProblem(overrides: Partial<DailyProblem> = {}): DailyProblem {
  const { answer: _a, reveal: _r, ...rest } = mockSolvedProblem(overrides as Partial<SolvedProblem>);
  void _a;
  void _r;
  return { ...rest, ...overrides };
}
