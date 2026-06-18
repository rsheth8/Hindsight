/**
 * Options & Greeks — educational synthetic scenarios.
 */
import { seededRand } from "../seeded-rand";
import type { ChoiceId, SolvedProblem } from "../types";

const SCENARIOS: {
  underlying: number;
  strike: number;
  dte: number;
  iv: number;
  positionLabel: string;
  greeks: { delta: number; gamma: number; theta: number; vega: number };
  answer: ChoiceId;
  choices: { id: ChoiceId; label: string }[];
  prompt: string;
}[] = [
  {
    underlying: 142,
    strike: 145,
    dte: 5,
    iv: 38,
    positionLabel: "Long 1 call",
    greeks: { delta: 0.42, gamma: 0.08, theta: -0.18, vega: 0.12 },
    answer: "C",
    prompt: "5 DTE long call, stock flat. What's the main risk?",
    choices: [
      { id: "A", label: "Vega crush only" },
      { id: "B", label: "Delta too low to matter" },
      { id: "C", label: "Theta decay — time is the enemy" },
    ],
  },
  {
    underlying: 88,
    strike: 90,
    dte: 45,
    iv: 22,
    positionLabel: "Long 1 put (hedge)",
    greeks: { delta: -0.35, gamma: 0.04, theta: -0.06, vega: 0.14 },
    answer: "A",
    prompt: "Hedging stock with a 45 DTE put. Stock drops 8%. What dominated P&L?",
    choices: [
      { id: "A", label: "Delta gain on the put offsets stock loss" },
      { id: "B", label: "Theta made the hedge worthless" },
      { id: "C", label: "Vega is the only driver" },
    ],
  },
  {
    underlying: 210,
    strike: 200,
    dte: 2,
    iv: 55,
    positionLabel: "Long 1 call (lotto)",
    greeks: { delta: 0.62, gamma: 0.22, theta: -0.35, vega: 0.08 },
    answer: "B",
    prompt: "2 DTE OTM call before earnings. What's the gamma story?",
    choices: [
      { id: "A", label: "Gamma doesn't matter near expiry" },
      { id: "B", label: "Delta swings wildly on small moves — high gamma risk" },
      { id: "C", label: "Theta is negligible at 2 DTE" },
    ],
  },
  {
    underlying: 175,
    strike: 180,
    dte: 1,
    iv: 72,
    positionLabel: "Long straddle (earnings)",
    greeks: { delta: 0.02, gamma: 0.35, theta: -0.55, vega: 0.28 },
    answer: "A",
    prompt: "Earnings just passed. IV was 70%, now 35%. You're long the straddle. What hit you?",
    choices: [
      { id: "A", label: "IV crush — vega loss even if the stock moved" },
      { id: "B", label: "Theta was irrelevant overnight" },
      { id: "C", label: "Delta hedging saved the trade" },
    ],
  },
  {
    underlying: 95,
    strike: 100,
    dte: 14,
    iv: 28,
    positionLabel: "Covered call (short 100C)",
    greeks: { delta: 0.55, gamma: -0.05, theta: 0.09, vega: -0.11 },
    answer: "B",
    prompt: "You own stock and sold a 14 DTE call. Stock rips through the strike. What happened?",
    choices: [
      { id: "A", label: "Unlimited upside — you're still long" },
      { id: "B", label: "Upside capped — assignment gives away shares above strike" },
      { id: "C", label: "The short call has no effect on stock P&L" },
    ],
  },
  {
    underlying: 120,
    strike: 115,
    dte: 30,
    iv: 25,
    positionLabel: "Bull call spread (115/125)",
    greeks: { delta: 0.38, gamma: 0.03, theta: -0.04, vega: 0.06 },
    answer: "C",
    prompt: "Long 115C / short 125C. Stock at 130. What's the spread worth?",
    choices: [
      { id: "A", label: "Unlimited — same as a naked call" },
      { id: "B", label: "Worthless — short leg cancels long" },
      { id: "C", label: "Capped near $10 — max width of the spread" },
    ],
  },
  {
    underlying: 400,
    strike: 400,
    dte: 21,
    iv: 18,
    positionLabel: "Short iron condor",
    greeks: { delta: 0.01, gamma: -0.02, theta: 0.07, vega: -0.15 },
    answer: "A",
    prompt: "Short iron condor, stock pinned near 400 into expiry. What's your edge source?",
    choices: [
      { id: "A", label: "Theta + range-bound — you want low movement" },
      { id: "B", label: "You need a big breakout to win" },
      { id: "C", label: "Vega expansion is your friend" },
    ],
  },
  {
    underlying: 52,
    strike: 50,
    dte: 7,
    iv: 45,
    positionLabel: "Short 1 cash-secured put",
    greeks: { delta: 0.32, gamma: -0.06, theta: 0.11, vega: -0.09 },
    answer: "C",
    prompt: "Sold a 7 DTE put for premium. Stock drops 15% fast. What's the real risk?",
    choices: [
      { id: "A", label: "You only lose the premium collected" },
      { id: "B", label: "Theta protects you from all losses" },
      { id: "C", label: "Assignment at strike — buying stock above market" },
    ],
  },
  {
    underlying: 68,
    strike: 70,
    dte: 60,
    iv: 40,
    positionLabel: "Long 70C / short 75C (vertical)",
    greeks: { delta: 0.28, gamma: 0.02, theta: -0.03, vega: 0.04 },
    answer: "B",
    prompt: "Bull call spread, 60 DTE. IV drops 10 points, stock flat. Why red?",
    choices: [
      { id: "A", label: "Delta went negative" },
      { id: "B", label: "Vega loss on the net long optionality" },
      { id: "C", label: "Assignment on the short leg" },
    ],
  },
  {
    underlying: 155,
    strike: 150,
    dte: 10,
    iv: 32,
    positionLabel: "Protective put (stock + long put)",
    greeks: { delta: 0.72, gamma: 0.05, theta: -0.08, vega: 0.1 },
    answer: "A",
    prompt: "Long stock + long 10 DTE put. Stock flat all week. Why is the hedge 'expensive'?",
    choices: [
      { id: "A", label: "Theta bleed on the put — insurance has a daily cost" },
      { id: "B", label: "Put delta is always zero" },
      { id: "C", label: "Vega crush on flat markets" },
    ],
  },
  {
    underlying: 230,
    strike: 220,
    dte: 45,
    iv: 30,
    positionLabel: "Calendar spread (short near / long far)",
    greeks: { delta: 0.15, gamma: 0.01, theta: 0.02, vega: 0.08 },
    answer: "C",
    prompt: "Short 30 DTE call, long 90 DTE call (same strike). Stock sits at strike. Who wins?",
    choices: [
      { id: "A", label: "Short leg — near expiry has no theta" },
      { id: "B", label: "Long leg — far dated has no decay" },
      { id: "C", label: "Near leg decays faster — classic calendar theta play" },
    ],
  },
  {
    underlying: 108,
    strike: 105,
    dte: 3,
    iv: 50,
    positionLabel: "Long 105C (deep ITM)",
    greeks: { delta: 0.88, gamma: 0.04, theta: -0.12, vega: 0.05 },
    answer: "B",
    prompt: "3 DTE deep ITM call used as stock replacement. Main carry cost?",
    choices: [
      { id: "A", label: "Vega — vol is the only drag" },
      { id: "B", label: "Theta on extrinsic value — still bleeds time premium" },
      { id: "C", label: "No cost — ITM calls are free leverage" },
    ],
  },
];

export function buildOptionsGreeksProblem(seed: string): SolvedProblem {
  const r = seededRand(seed);
  const s = SCENARIOS[Math.floor(r() * SCENARIOS.length)]!;
  const id = `options-${seed}`;

  return {
    id,
    date: new Date().toISOString().slice(0, 10),
    type: "options-greeks",
    series: [
      { t: 0, v: 100 },
      { t: 1, v: 102 },
      { t: 2, v: 101 },
      { t: 3, v: 103 },
    ],
    metrics: [
      { label: "Underlying", value: `$${s.underlying}` },
      { label: "Strike", value: `$${s.strike}` },
      { label: "DTE", value: String(s.dte) },
      { label: "IV", value: `${s.iv}%` },
      { label: "Δ", value: s.greeks.delta.toFixed(2) },
      { label: "Θ", value: s.greeks.theta.toFixed(2) },
      { label: "Γ", value: s.greeks.gamma.toFixed(2) },
      { label: "ν", value: s.greeks.vega.toFixed(2) },
    ],
    prompt: s.prompt,
    choices: s.choices,
    horizonLabel: "risk framing",
    difficulty: 0.65,
    crowd: { A: 30, B: 35, C: 35 },
    live: false,
    optionsSetup: {
      underlying: s.underlying,
      strike: s.strike,
      dte: s.dte,
      iv: s.iv,
      positionLabel: s.positionLabel,
      greeks: s.greeks,
    },
    answer: s.answer,
    reveal: {
      ticker: "OPT",
      company: s.positionLabel,
      decisionDate: "2024-06-01",
      resolveDate: "2024-06-08",
      forwardReturnPct: 0,
      continuation: [{ t: 0, v: 103 }, { t: 1, v: 103 }],
    },
  };
}
