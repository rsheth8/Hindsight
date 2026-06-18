/**
 * Futures & leverage — educational synthetic scenarios (notional, gaps, rolls).
 */
import { seededRand } from "../seeded-rand";
import type { ChoiceId, SolvedProblem } from "../types";

const SCENARIOS: {
  instrument: string;
  positionLabel: string;
  context: string;
  notional: string;
  answer: ChoiceId;
  choices: { id: ChoiceId; label: string }[];
  prompt: string;
}[] = [
  {
    instrument: "ES (S&P 500 futures)",
    positionLabel: "Long 1 ES overnight",
    context: "Held through the close into a macro data print at 8:30am",
    notional: "~$275k notional / ~$15k margin",
    answer: "A",
    prompt: "Long ES held overnight before a CPI print. What's the main risk vs. holding SPY?",
    choices: [
      { id: "A", label: "Gap risk — can open far from your entry with no chance to exit" },
      { id: "B", label: "Dividends are the bigger difference" },
      { id: "C", label: "Futures can't lose more than margin posted" },
    ],
  },
  {
    instrument: "USO (oil ETF)",
    positionLabel: "Long USO (1-year hold)",
    context: "Front-month oil futures in contango",
    notional: "ETF, not direct futures",
    answer: "B",
    prompt: "Oil spot is flat for a year but USO is down. What likely happened?",
    choices: [
      { id: "A", label: "Management fees only" },
      { id: "B", label: "Roll cost — selling cheap front month, buying expensive back month" },
      { id: "C", label: "USO tracks spot perfectly" },
    ],
  },
  {
    instrument: "MES (Micro E-mini)",
    positionLabel: "Long 5 MES vs 1 ES",
    context: "Same index exposure, different contract size",
    notional: "MES ≈ 1/10 ES per contract",
    answer: "C",
    prompt: "You want ~$50k index exposure. Why might MES be better than ES?",
    choices: [
      { id: "A", label: "MES has lower correlation to the index" },
      { id: "B", label: "MES has no overnight risk" },
      { id: "C", label: "Finer sizing — less overshooting your target notional" },
    ],
  },
  {
    instrument: "NQ (Nasdaq futures)",
    positionLabel: "Short 1 NQ hedge",
    context: "Long a tech-heavy stock portfolio, short NQ to reduce beta",
    notional: "~$400k notional per contract",
    answer: "A",
    prompt: "Short NQ to hedge tech stocks. Nasdaq rallies 3% but your stocks rally 1%. What happened?",
    choices: [
      { id: "A", label: "Imperfect hedge — beta mismatch; you're still net long" },
      { id: "B", label: "Hedge failed — futures don't offset stocks" },
      { id: "C", label: "You made money on the hedge" },
    ],
  },
  {
    instrument: "NG (Natural gas futures)",
    positionLabel: "Long front-month NG",
    context: "Curve in backwardation — back months cheaper",
    notional: "~$30k per contract",
    answer: "B",
    prompt: "Gas spot flat, but you're long front-month in backwardation. Roll impact?",
    choices: [
      { id: "A", label: "Roll drag like contango" },
      { id: "B", label: "Positive roll yield — sell high front, buy lower back" },
      { id: "C", label: "Backwardation has no roll effect" },
    ],
  },
  {
    instrument: "ZB (30-yr Treasury futures)",
    positionLabel: "Long 1 ZB",
    context: "Rates spike 25bp in one session",
    notional: "~$150k notional",
    answer: "C",
    prompt: "Long bond futures when yields jump sharply. What hits you first?",
    choices: [
      { id: "A", label: "Theta decay" },
      { id: "B", label: "Dividend risk" },
      { id: "C", label: "Duration — price drops as yields rise" },
    ],
  },
];

export function buildFuturesBasicsProblem(seed: string): SolvedProblem {
  const r = seededRand(seed);
  const s = SCENARIOS[Math.floor(r() * SCENARIOS.length)]!;
  const id = `futures-${seed}`;

  return {
    id,
    date: new Date().toISOString().slice(0, 10),
    type: "futures-basics",
    series: [
      { t: 0, v: 100 },
      { t: 1, v: 101 },
      { t: 2, v: 99 },
      { t: 3, v: 98 },
    ],
    metrics: [
      { label: "Instrument", value: s.instrument },
      { label: "Position", value: s.positionLabel },
      { label: "Context", value: s.context },
      { label: "Notional", value: s.notional },
    ],
    prompt: s.prompt,
    choices: s.choices,
    horizonLabel: "risk framing",
    difficulty: 0.62,
    crowd: { A: 34, B: 33, C: 33 },
    live: false,
    futuresSetup: {
      instrument: s.instrument,
      positionLabel: s.positionLabel,
      context: s.context,
      notional: s.notional,
    },
    answer: s.answer,
    reveal: {
      ticker: "FUT",
      company: s.positionLabel,
      decisionDate: "2024-03-01",
      resolveDate: "2024-03-08",
      forwardReturnPct: 0,
      continuation: [{ t: 0, v: 98 }, { t: 1, v: 98 }],
    },
  };
}
