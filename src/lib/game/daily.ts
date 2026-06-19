/**
 * Builds today's problem — the date-seeded "read the setup" puzzle. Tries live
 * FMP price history first; falls back to a small static bank when no key is set
 * so the app always runs and demos.
 */
import { fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";
import { hashSeed, pick, rng, todayKey } from "./seed";
import { UNIVERSE } from "./universe";
import { computeMetrics, deriveSituationBands, estimateDifficulty, type Bar } from "./metrics";
import { FALLBACK_BANK } from "./fallback";
import type { ChoiceId, PricepointLite, SetupBand, SolvedProblem } from "./types";

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

/**
 * Best-effort point-in-time fundamental bands for a live problem. Strictly
 * look-ahead-safe: only statements dated *before* the decision date feed the
 * trend reads, and everything is qualitative (no figures that could be reversed
 * to a ticker+date). Any failure → fewer/no bands; the problem still builds.
 */
async function fetchFundamentalBands(ticker: string, asOf: string): Promise<SetupBand[]> {
  const bands: SetupBand[] = [];

  try {
    const profile = await fmpFetch<{ sector?: string }[]>("/profile", { symbol: ticker });
    const sector = profile?.[0]?.sector;
    if (sector) bands.push({ label: "Sector", value: sector, hint: "What the business does — sectors behave differently in the same market." });
  } catch {
    /* sector is optional */
  }

  try {
    // limit ~40 quarters (~10y) so decision dates well in the past still find priors;
    // older than that → no fundamentals (graceful, situation bands still show).
    const stmts = await fmpFetch<
      { date: string; fillingDate?: string; acceptedDate?: string; revenue?: number; grossProfit?: number }[]
    >("/income-statement", { symbol: ticker, period: "quarter", limit: 40 });
    // Gate on when the statement became PUBLIC (filing/accepted date), not the
    // fiscal period end — a quarter ending Mar 31 isn't known until it's filed
    // weeks later, so filtering on the period date would leak look-ahead data.
    const knownDate = (s: { date: string; fillingDate?: string; acceptedDate?: string }) =>
      (s.acceptedDate ?? s.fillingDate ?? s.date).slice(0, 10);
    const prior = (stmts ?? [])
      .filter((s) => typeof s.date === "string" && knownDate(s) < asOf)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (prior.length >= 5) {
      const latest = prior[0];
      const yearAgo = prior[4]; // ~4 quarters back → year-over-year
      if (latest.revenue && yearAgo.revenue) {
        const g = (latest.revenue / yearAgo.revenue - 1) * 100;
        const value = g > 25 ? "Growing fast" : g > 8 ? "Growing steadily" : g > -2 ? "Roughly flat" : "Shrinking";
        bands.push({ label: "Revenue", value, hint: "Year-over-year sales trend as of the decision date." });
      }
      const margin = (s: { revenue?: number; grossProfit?: number }) =>
        s.grossProfit && s.revenue ? s.grossProfit / s.revenue : null;
      const ml = margin(latest);
      const my = margin(yearAgo);
      if (ml != null && my != null) {
        const d = (ml - my) * 100;
        const value = d > 1.5 ? "Margins expanding" : d < -1.5 ? "Margins compressing" : "Margins steady";
        bands.push({ label: "Profitability", value, hint: "Direction of gross margin over the prior year." });
      }
    }
  } catch {
    /* fundamentals are optional */
  }

  return bands;
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
  const difficulty = estimateDifficulty(history);
  // Illustrative crowd leans on the *visible* trailing trend, not the hidden answer.
  const trailingPct = (decisionBar.close / history[0].close - 1) * 100;
  const crowd = syntheticCrowd(r, classify(trailingPct));

  // Context to reason with: price-derived situation bands (always) + best-effort
  // point-in-time fundamentals (graceful — empty if the API can't serve them).
  const situationBands = deriveSituationBands(history);
  let fundamentalBands: SetupBand[] = [];
  try {
    fundamentalBands = await fetchFundamentalBands(ticker, decisionBar.date);
  } catch {
    /* bands are best-effort */
  }

  return {
    id: `live-${dateKey}-${ticker}`,
    date: dateKey,
    type: "read-the-setup",
    series: indexSeries(history, base, 0),
    metrics,
    bands: [...situationBands, ...fundamentalBands],
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
