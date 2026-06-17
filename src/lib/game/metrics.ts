/**
 * Point-in-time setup metrics derived purely from the price history the player
 * can see — no look-ahead, no survivorship problem. These are the honest clues.
 */
import type { SetupMetric } from "./types";

export interface Bar {
  date: string;
  close: number;
}

const TRADING_DAYS_YEAR = 252;

function pctReturn(from: number, to: number): number {
  return (to / from - 1) * 100;
}

/** Annualized volatility from daily log returns, in %. */
function annualizedVol(bars: Bar[]): number {
  if (bars.length < 3) return 0;
  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    rets.push(Math.log(bars[i].close / bars[i - 1].close));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_YEAR) * 100;
}

/** Worst peak-to-trough drawdown over the window, in %. */
function maxDrawdown(bars: Bar[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const b of bars) {
    if (b.close > peak) peak = b.close;
    const dd = (b.close / peak - 1) * 100;
    if (dd < worst) worst = dd;
  }
  return worst;
}

/** Simple moving average of the last n closes. */
function sma(bars: Bar[], n: number): number {
  const slice = bars.slice(-n);
  return slice.reduce((a, b) => a + b.close, 0) / slice.length;
}

export function computeMetrics(history: Bar[]): SetupMetric[] {
  const first = history[0].close;
  const last = history[history.length - 1].close;
  const high = Math.max(...history.map((b) => b.close));
  const ret6m = pctReturn(first, last);
  const vol = annualizedVol(history);
  const dd = maxDrawdown(history);
  const fromHigh = pctReturn(high, last);
  const ma50 = sma(history, 50);
  const aboveMa = ((last / ma50 - 1) * 100);

  const fmt = (x: number, sign = true) => `${sign && x > 0 ? "+" : ""}${x.toFixed(1)}%`;

  return [
    { label: "6-month return", value: fmt(ret6m), hint: "Price change over the window you can see." },
    { label: "Annualized volatility", value: `${vol.toFixed(0)}%`, hint: "How jumpy the stock has been — higher = wider outcomes." },
    { label: "Max drawdown (window)", value: fmt(dd), hint: "Worst peak-to-trough drop inside the window." },
    { label: "From window high", value: fmt(fromHigh), hint: "Distance below the highest close shown." },
    { label: "Vs 50-day average", value: fmt(aboveMa), hint: "Above the trend line (momentum) or below it." },
  ];
}

/** Difficulty 0–1: outcomes that land near the ±10% decision boundaries, or in
 *  high-vol names, are genuinely harder to call. */
export function estimateDifficulty(forwardReturnPct: number, vol: number): number {
  const distToBoundary = Math.min(
    Math.abs(forwardReturnPct - 10),
    Math.abs(forwardReturnPct + 10),
    Math.abs(forwardReturnPct),
  );
  // Close to a boundary → harder. 0% away → ~0.9, 15%+ away → ~0.3.
  const boundary = Math.max(0, 1 - distToBoundary / 18);
  const volComponent = Math.min(1, vol / 60);
  return Math.max(0.15, Math.min(0.95, 0.3 + 0.5 * boundary + 0.2 * volComponent));
}
