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

const CHOICES = [
  { id: "A" as ChoiceId, label: "Gained more than 10%" },
  { id: "B" as ChoiceId, label: "Stayed within ±10%" },
  { id: "C" as ChoiceId, label: "Fell more than 10%" },
];

const PROMPT = "Over the next 3 months (~63 trading days), this stock most likely…";
const HORIZON = "3 months";

function classify(forwardPct: number): ChoiceId {
  if (forwardPct > 10) return "A";
  if (forwardPct < -10) return "C";
  return "B";
}

/** Index a price series so the first point reads 100, anonymizing the level. */
function indexSeries(bars: Bar[], base: number, startStep: number): PricepointLite[] {
  return bars.map((b, i) => ({ t: startStep + i, v: +((b.close / base) * 100).toFixed(2) }));
}

/** Synthetic-but-seeded crowd split, tilted toward trend continuation. Flagged
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

  // Pick a historical decision date 1–6 years back so it's genuinely "history".
  const yearsBack = 1 + r() * 5;
  const decision = new Date();
  decision.setUTCDate(decision.getUTCDate() - Math.round(yearsBack * 365));
  const fromDate = new Date(decision);
  fromDate.setUTCDate(fromDate.getUTCDate() - 320); // buffer for ~126 trading days

  const rows = await fmpFetch<{ date: string; close: number }[]>("/historical-price-eod/full", {
    symbol: ticker,
    from: fromDate.toISOString().slice(0, 10),
  });
  const bars: Bar[] = (rows ?? [])
    .filter((b) => typeof b.close === "number")
    .map((b) => ({ date: b.date, close: b.close }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (bars.length < HISTORY_DAYS + FORWARD_DAYS + 5) {
    throw new Error(`insufficient history for ${ticker}`);
  }

  // Decision index = first bar at/after the decision date.
  const decisionStr = decision.toISOString().slice(0, 10);
  let di = bars.findIndex((b) => b.date >= decisionStr);
  if (di < HISTORY_DAYS) di = HISTORY_DAYS;
  if (di + FORWARD_DAYS >= bars.length) di = bars.length - FORWARD_DAYS - 1;

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
  const leaning = forwardPct >= 0 ? (forwardPct > 10 ? "A" : "B") : (forwardPct < -10 ? "C" : "B");
  const crowd = syntheticCrowd(r, leaning);

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
