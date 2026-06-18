/**
 * Spot the flaw — diagnose a reasoning error in a market thesis.
 */
import { seededRand } from "../seeded-rand";
import type { ChoiceId, SolvedProblem } from "../types";

const SCENARIOS: {
  thesis: string;
  chartCaption: string;
  answer: ChoiceId;
  choices: { id: ChoiceId; label: string }[];
  ticker: string;
  company: string;
}[] = [
  {
    thesis:
      "It's up 60% in three months with no pullback — momentum this strong usually keeps going. I'd size up here.",
    chartCaption: "Parabolic rally, RSI stretched",
    answer: "A",
    choices: [
      { id: "A", label: "Trend extrapolation — ignoring reversal risk" },
      { id: "B", label: "Solid momentum read" },
      { id: "C", label: "Underconfidence — should be more bullish" },
    ],
    ticker: "DEMO1",
    company: "Example Corp",
  },
  {
    thesis:
      "It crashed 40% so it must be cheap now. Mean reversion always wins after a drawdown this big.",
    chartCaption: "Deep drawdown, no stabilization yet",
    answer: "A",
    choices: [
      { id: "A", label: "Catching a falling knife — ignoring trend" },
      { id: "B", label: "Correct value mindset" },
      { id: "C", label: "Too bearish — missed the bounce" },
    ],
    ticker: "DEMO2",
    company: "Sample Inc",
  },
  {
    thesis:
      "One analyst upgrade and a viral tweet — that's enough conviction for 90% confidence long.",
    chartCaption: "Flat price, single-day pop on news",
    answer: "B",
    choices: [
      { id: "A", label: "Under-reacting to catalysts" },
      { id: "B", label: "Cherry-picking noise as signal" },
      { id: "C", label: "Well-sized news trade" },
    ],
    ticker: "DEMO3",
    company: "Noise Co",
  },
  {
    thesis:
      "Every stock in this sector doubled — this laggard has to catch up. It's the safest bet left.",
    chartCaption: "Sector rip, one name flat on weak fundamentals",
    answer: "A",
    choices: [
      { id: "A", label: "Peer anchoring — laggards often lag for a reason" },
      { id: "B", label: "Smart relative-value trade" },
      { id: "C", label: "Too cautious — catch-up is guaranteed" },
    ],
    ticker: "DEMO4",
    company: "Laggard Ltd",
  },
  {
    thesis:
      "It beat earnings by a penny last quarter and the chart looks fine — I'm 95% sure it beats again.",
    chartCaption: "One good quarter, valuation stretched",
    answer: "B",
    choices: [
      { id: "A", label: "Underconfidence on a clear streak" },
      { id: "B", label: "Recency bias — one data point ≠ a pattern" },
      { id: "C", label: "Perfect earnings momentum read" },
    ],
    ticker: "DEMO5",
    company: "One-Quarter Co",
  },
  {
    thesis:
      "It's still 50% below its IPO price, so there's tons of room to run back to the listing.",
    chartCaption: "Broken IPO, fundamentals deteriorated since debut",
    answer: "C",
    choices: [
      { id: "A", label: "Valid anchor — IPO price is fair value" },
      { id: "B", label: "Underconfidence — IPO buyers were wrong" },
      { id: "C", label: "Anchoring — past prices aren't support levels" },
    ],
    ticker: "DEMO6",
    company: "IPO Ghost Inc",
  },
  {
    thesis:
      "Rates are rising but this stock hasn't sold off yet — that means it's immune. Load up.",
    chartCaption: "Macro headwind building, price complacent",
    answer: "A",
    choices: [
      { id: "A", label: "Ignoring macro regime — lag ≠ immunity" },
      { id: "B", label: "Correct idiosyncratic strength call" },
      { id: "C", label: "Too bearish on macro" },
    ],
    ticker: "DEMO7",
    company: "Macro Denial Co",
  },
];

export function buildSpotTheFlawProblem(seed: string): SolvedProblem {
  const r = seededRand(seed);
  const s = SCENARIOS[Math.floor(r() * SCENARIOS.length)]!;
  const id = `flaw-${seed}`;

  return {
    id,
    date: new Date().toISOString().slice(0, 10),
    type: "spot-the-flaw",
    series: [
      { t: 0, v: 100 },
      { t: 1, v: 108 },
      { t: 2, v: 115 },
      { t: 3, v: 122 },
      { t: 4, v: 118 },
    ],
    metrics: [
      { label: "Setup", value: s.chartCaption },
      { label: "Mode", value: "Spot the flaw" },
    ],
    prompt: "Which flaw best describes this thesis?",
    choices: s.choices,
    horizonLabel: "diagnosis",
    difficulty: 0.55,
    crowd: { A: 38, B: 34, C: 28 },
    live: false,
    flawSetup: { thesis: s.thesis, chartCaption: s.chartCaption },
    answer: s.answer,
    reveal: {
      ticker: s.ticker,
      company: s.company,
      decisionDate: "2024-01-15",
      resolveDate: "2024-04-15",
      forwardReturnPct: 0,
      continuation: [
        { t: 0, v: 118 },
        { t: 1, v: 115 },
      ],
    },
  };
}
