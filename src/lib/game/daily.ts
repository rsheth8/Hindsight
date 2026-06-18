/**
 * Builds today's problem — the date-seeded "read the setup" puzzle. Tries live
 * FMP price history first; falls back to a small static bank when no key is set
 * so the app always runs and demos.
 */
import { fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";
import { hashSeed, pick, rng, todayKey } from "./seed";
import { UNIVERSE } from "./universe";
import { computeMetrics, estimateDifficulty, type Bar } from "./metrics";
import { FALLBACK_BANK } from "./fallback";
import type { ChoiceId, PricepointLite, SolvedProblem } from "./types";

const HISTORY_DAYS = 126; // ~6 months of trading days shown
const FORWARD_DAYS = 63; // ~3 months forward to resolve
const LOOKBACK_YEARS = 11; // long fetch window so we can balance the outcome class

const CHOICES = [
  { id: "A" as ChoiceId, label: "Gained more than 10%" },
  { id: "B" as ChoiceId, label: "Stayed within ±10%" },
  { id: "C" as ChoiceId, label: "Fell more than 10%" },
];
const CLASSES: ChoiceId[] = ["A", "B", "C"];

const PROMPT = "Over the next 3 months (~63 trading days), this stock most likely…";
const HORIZON = "3 months";

function classify(forwardPct: number): ChoiceId {
  if (forwardPct > 10) return "A";
  if (forwardPct < -10) return "C";
  return "B";
}

/**
 * Target outcome class for this seed, rotated ~evenly across A/B/C. The live
 * universe is large-cap survivors whose unconditional 3-month returns skew up,
 * so without this "always pick Gained >10%" would beat chance. Balancing the
 * decision date to the target class makes the answer distribution ~uniform and
 * keeps the game a test of judgment, not of the market's base rate.
 */
function targetClassFor(seedKey: string): ChoiceId {
  return CLASSES[hashSeed(`${seedKey}|outcome-class`) % 3];
}

/** Index a price series so the first point reads 100, anonymizing the level. */
function indexSeries(bars: Bar[], base: number, startStep: number): PricepointLite[] {
  return bars.map((b, i) => ({ t: startStep + i, v: +((b.close / base) * 100).toFixed(2) }));
}

/** Synthetic-but-seeded crowd split, tilted toward the visible trailing trend
 *  (trend-chasing) — never toward the hidden answer, so it leaks nothing. Flagged
 *  as synthetic in the UI until real telemetry replaces it. */
function syntheticCrowd(r: () => number, leaning: ChoiceId): Record<ChoiceId, number> {
  const base = { A: 0.3, B: 0.4, C: 0.3 } as Record<ChoiceId, number>;
  base[leaning] += 0.12 + r() * 0.1;
  // jitter
  (["A", "B", "C"] as ChoiceId[]).forEach((id) => (base[id] += (r() - 0.5) * 0.08));
  const total = base.A + base.B + base.C;
  return {
    A: Math.round((base.A / total) * 100),
    B: Math.round((base.B / total) * 100),
    C: Math.round((base.C / total) * 100),
  };
}

async function buildLive(dateKey: string): Promise<SolvedProblem> {
  const r = rng(hashSeed(dateKey));
  const { ticker, company } = pick(UNIVERSE, r);

  // Fetch a long window so many candidate decision dates are available to balance.
  const fromDate = new Date();
  fromDate.setUTCFullYear(fromDate.getUTCFullYear() - LOOKBACK_YEARS);

  const rows = await fmpFetch<{ date: string; close: number; adjClose?: number }[]>(
    "/historical-price-eod/full",
    { symbol: ticker, from: fromDate.toISOString().slice(0, 10) },
  );
  // Use the dividend+split adjusted close (total return) when present; the API's
  // bare `close` is split-adjusted only. Chart, metrics, and outcome all use the
  // same series, so they stay internally consistent.
  const bars: Bar[] = (rows ?? [])
    .map((b) => ({ date: b.date, close: b.adjClose ?? b.close }))
    .filter((b) => typeof b.close === "number")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (bars.length < HISTORY_DAYS + FORWARD_DAYS + 5) {
    throw new Error(`insufficient history for ${ticker}`);
  }

  // Every index with a full visible window behind it and a resolved 3-month leg
  // ahead is a candidate decision date. Prefer dates whose forward outcome lands
  // in this seed's target class (balanced A/B/C); fall back to any if none exist.
  const lastDi = bars.length - FORWARD_DAYS - 1;
  const target = targetClassFor(dateKey);
  const inTarget: number[] = [];
  const allValid: number[] = [];
  for (let i = HISTORY_DAYS; i <= lastDi; i++) {
    allValid.push(i);
    const fwd = (bars[i + FORWARD_DAYS].close / bars[i].close - 1) * 100;
    if (classify(fwd) === target) inTarget.push(i);
  }
  const pool = inTarget.length ? inTarget : allValid;
  const di = pool[Math.floor(r() * pool.length)];

  const history = bars.slice(di - HISTORY_DAYS, di + 1);
  const resolveBar = bars[di + FORWARD_DAYS];
  const decisionBar = bars[di];
  const continuation = bars.slice(di, di + FORWARD_DAYS + 1);

  const forwardPct = (resolveBar.close / decisionBar.close - 1) * 100;
  const answer = classify(forwardPct);
  const base = history[0].close;

  const metrics = computeMetrics(history);
  const vol = parseFloat(metrics[1].value);
  const difficulty = estimateDifficulty(forwardPct, vol);
  // Illustrative crowd leans on the *visible* trailing trend, not the hidden answer.
  const trailingPct = (decisionBar.close / history[0].close - 1) * 100;
  const crowd = syntheticCrowd(r, classify(trailingPct));

  return {
    id: `live-${dateKey}-${ticker}`,
    date: dateKey,
    type: "read-the-setup",
    series: indexSeries(history, base, 0),
    metrics,
    prompt: PROMPT,
    choices: CHOICES,
    horizonLabel: HORIZON,
    difficulty,
    crowd,
    live: true,
    answer,
    reveal: {
      ticker,
      company,
      decisionDate: decisionBar.date,
      resolveDate: resolveBar.date,
      forwardReturnPct: +forwardPct.toFixed(1),
      continuation: indexSeries(continuation, base, HISTORY_DAYS),
    },
  };
}

function buildFallback(dateKey: string): SolvedProblem {
  const r = rng(hashSeed(dateKey));
  const p = pick(FALLBACK_BANK, r);
  const crowd = syntheticCrowd(r, p.answer);
  return { ...p, id: `bank-${dateKey}-${p.reveal.ticker}`, date: dateKey, crowd, live: false };
}

/** The one public entrypoint. Always returns a fully solved problem. */
export async function buildProblemForSeed(seedKey: string): Promise<SolvedProblem> {
  if (hasFmpApiKey()) {
    try {
      return await buildLive(seedKey);
    } catch (err) {
      console.error("[daily] live build failed, using fallback:", err);
    }
  }
  return buildFallback(seedKey);
}

export async function getDailyProblem(now: Date = new Date()): Promise<SolvedProblem> {
  return buildProblemForSeed(todayKey(now));
}
