/**
 * Static fallback problem bank — used only when no FMP key is configured, so
 * the app always runs. Series are synthetic (clearly flagged `live: false` in
 * the UI) but shaped like real setups, with honest computed metrics + a real
 * forward outcome baked in.
 */
import { computeMetrics, estimateDifficulty, type Bar } from "./metrics";
import { rng } from "./seed";
import type { ChoiceId, PricepointLite, SolvedProblem } from "./types";

type BankEntry = Omit<SolvedProblem, "id" | "date" | "crowd" | "live">;

const CHOICES = [
  { id: "A" as ChoiceId, label: "Gained more than 10%" },
  { id: "B" as ChoiceId, label: "Stayed within ±10%" },
  { id: "C" as ChoiceId, label: "Fell more than 10%" },
];
const PROMPT = "Over the next 3 months (~63 trading days), this stock most likely…";
const HORIZON = "3 months";
const HISTORY = 126;
const FORWARD = 63;

function classify(pct: number): ChoiceId {
  if (pct > 10) return "A";
  if (pct < -10) return "C";
  return "B";
}

/** Geometric random walk with drift + occasional shock, seeded per scenario.
 *  `dayOffset` shifts the calendar so the forward leg continues after history. */
function genBars(seed: number, drift: number, vol: number, n: number, start = 100, dayOffset = 0): Bar[] {
  const r = rng(seed);
  const bars: Bar[] = [];
  let price = start;
  const base = new Date("2021-01-04");
  for (let i = 0; i < n; i++) {
    const shock = (r() - 0.5) * 2 * vol;
    price = price * (1 + drift + shock);
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + dayOffset + i);
    bars.push({ date: d.toISOString().slice(0, 10), close: +price.toFixed(2) });
  }
  return bars;
}

function indexSeries(bars: Bar[], base: number, startStep: number): PricepointLite[] {
  return bars.map((b, i) => ({ t: startStep + i, v: +((b.close / base) * 100).toFixed(2) }));
}

function makeEntry(opts: {
  ticker: string;
  company: string;
  seed: number;
  histDrift: number;
  histVol: number;
  fwdDrift: number;
  fwdVol: number;
}): BankEntry {
  const all = genBars(opts.seed, opts.histDrift, opts.histVol, HISTORY + FORWARD + 1);
  const history = all.slice(0, HISTORY + 1);
  // regenerate forward leg with its own drift so outcomes are controllable
  const fwd = genBars(opts.seed + 7, opts.fwdDrift, opts.fwdVol, FORWARD + 1, history[history.length - 1].close, HISTORY);
  const decisionBar = history[history.length - 1];
  const resolveBar = fwd[fwd.length - 1];
  const forwardPct = (resolveBar.close / decisionBar.close - 1) * 100;
  const base = history[0].close;
  const metrics = computeMetrics(history);
  const vol = parseFloat(metrics[1].value);

  return {
    type: "read-the-setup",
    series: indexSeries(history, base, 0),
    metrics,
    prompt: PROMPT,
    choices: CHOICES,
    horizonLabel: HORIZON,
    difficulty: estimateDifficulty(forwardPct, vol),
    answer: classify(forwardPct),
    reveal: {
      ticker: opts.ticker,
      company: opts.company,
      decisionDate: decisionBar.date,
      resolveDate: resolveBar.date,
      forwardReturnPct: +forwardPct.toFixed(1),
      continuation: indexSeries(fwd, base, HISTORY),
    },
  };
}

// Forward legs are tuned to ~balance the outcome class (≈3 A / 4 B / 3 C): B
// entries use a small drift + low forward vol so they reliably stay within ±10%,
// while A/C use a clear drift. Synthetic price series (no dividends modeled) — only
// used when no FMP key is set, and always flagged `live: false` in the UI.
export const FALLBACK_BANK: BankEntry[] = [
  // A — Gained more than 10%
  makeEntry({ ticker: "DEMO1", company: "Northwind Industrials", seed: 101, histDrift: 0.004, histVol: 0.012, fwdDrift: 0.0035, fwdVol: 0.010 }),
  makeEntry({ ticker: "DEMO4", company: "Meridian Energy", seed: 404, histDrift: 0.002, histVol: 0.018, fwdDrift: 0.004, fwdVol: 0.012 }),
  makeEntry({ ticker: "DEMO7", company: "Atlas Semiconductors", seed: 707, histDrift: 0.009, histVol: 0.028, fwdDrift: 0.005, fwdVol: 0.014 }),
  // B — Stayed within ±10% (small drift, low forward vol)
  makeEntry({ ticker: "DEMO3", company: "Harbor Retail", seed: 303, histDrift: -0.003, histVol: 0.015, fwdDrift: 0.0008, fwdVol: 0.007 }),
  makeEntry({ ticker: "DEMO6", company: "Sterling Financial", seed: 606, histDrift: 0.0015, histVol: 0.011, fwdDrift: 0.0003, fwdVol: 0.006 }),
  makeEntry({ ticker: "DEMO9", company: "Ironclad Mining", seed: 909, histDrift: -0.006, histVol: 0.034, fwdDrift: -0.0006, fwdVol: 0.008 }),
  makeEntry({ ticker: "DEMO10", company: "Summit Cloud", seed: 1010, histDrift: 0.008, histVol: 0.022, fwdDrift: 0.0010, fwdVol: 0.008 }),
  // C — Fell more than 10%
  makeEntry({ ticker: "DEMO2", company: "Cascade Software", seed: 202, histDrift: 0.006, histVol: 0.02, fwdDrift: -0.004, fwdVol: 0.018 }),
  makeEntry({ ticker: "DEMO5", company: "Vertex Biotech", seed: 505, histDrift: 0.008, histVol: 0.03, fwdDrift: -0.005, fwdVol: 0.022 }),
  makeEntry({ ticker: "DEMO8", company: "Volta Pharmaceuticals", seed: 808, histDrift: 0.01, histVol: 0.038, fwdDrift: -0.0035, fwdVol: 0.020 }),
];
