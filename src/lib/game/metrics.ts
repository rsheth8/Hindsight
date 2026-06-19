/**
 * Point-in-time setup metrics derived purely from the price history the player
 * can see — strictly no look-ahead (nothing past the decision date feeds these).
 *
 * NOTE: these clues do NOT remove survivorship bias. The live universe is today's
 * liquid large-caps (see universe.ts), so every name survived to the present and
 * raw base rates skew upward. We counter that at *selection* time by balancing the
 * forward-outcome class across A/B/C (see daily.ts), not here.
 */
import type { SetupMetric, SetupBand } from "./types";

const TRADING_DAYS_MONTH = 21;

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
  // Label the return by how much history is actually visible (blind replay truncates it).
  const months = Math.max(1, Math.round((history.length - 1) / TRADING_DAYS_MONTH));

  return [
    { label: `${months}-month return`, value: fmt(ret6m), hint: "Total return over the window you can see." },
    { label: "Annualized volatility", value: `${vol.toFixed(0)}%`, hint: "How jumpy the stock has been — higher = wider outcomes." },
    { label: "Max drawdown (window)", value: fmt(dd), hint: "Worst peak-to-trough drop inside the window." },
    { label: "From window high", value: fmt(fromHigh), hint: "Distance below the highest close shown." },
    { label: "Vs 50-day average", value: fmt(aboveMa), hint: "Above the trend line (momentum) or below it." },
  ];
}

/**
 * Qualitative "situation" bands derived purely from the visible price history —
 * trend, volatility regime, and position vs the window high. Strictly no
 * look-ahead (nothing past the decision date), and never the forward outcome, so
 * these describe what the player can already see, just in plain language. They
 * make the setup legible without adding any signal that leaks the answer.
 */
export function deriveSituationBands(history: Bar[]): SetupBand[] {
  if (history.length < 3) return [];
  const first = history[0].close;
  const last = history[history.length - 1].close;
  const high = Math.max(...history.map((b) => b.close));
  const ret = pctReturn(first, last);
  const vol = annualizedVol(history);
  const fromHigh = pctReturn(high, last);
  const vsMa = (last / sma(history, 50) - 1) * 100;

  let trend: string;
  if (ret > 15 && vsMa > 1) trend = "Strong uptrend";
  else if (ret > 4) trend = "Grinding higher";
  else if (ret < -15 && vsMa < -1) trend = "In a downtrend";
  else if (ret < -4) trend = "Drifting lower";
  else trend = "Rangebound / flat";

  const volBand = vol < 22 ? "Calm" : vol < 40 ? "Choppy" : "Highly volatile";

  let position: string;
  if (fromHigh > -2) position = "Pushing new highs";
  else if (fromHigh > -10) position = "Just off its highs";
  else if (fromHigh > -25) position = "Well below its highs";
  else position = "Deep in a drawdown";

  return [
    { label: "Trend", value: trend, hint: "The direction of the price over the window you can see." },
    { label: "Volatility", value: volBand, hint: "How wide the swings have been — wider means more uncertain outcomes." },
    { label: "Position", value: position, hint: "Where it sits relative to its highest close in the window." },
  ];
}

/**
 * Difficulty 0–1 from VISIBLE setup features only — never the forward outcome.
 * (Keying off how close the realized return landed to a boundary would leak the
 * result, since difficulty is shown before the player commits.) A setup is harder
 * when realized volatility is high (wide outcome distribution) and when the
 * directional signal is weak — flat and sitting on the 50-day average.
 */
export function estimateDifficulty(history: Bar[]): number {
  if (history.length < 3) return 0.5;
  const vol = annualizedVol(history);
  const ret = pctReturn(history[0].close, history[history.length - 1].close);
  const ma50 = sma(history, 50);
  const vsMa = (history[history.length - 1].close / ma50 - 1) * 100;

  const volComponent = Math.min(1, vol / 55); // ~55%+ annualized vol = max uncertainty
  // How clear the directional read is: a big trailing move or a price far from its
  // trend line is an easier call than a flat chart hugging the 50-day.
  const trendClarity = Math.min(1, Math.max(Math.abs(ret) / 30, Math.abs(vsMa) / 12));
  const difficulty = 0.25 + 0.55 * volComponent + 0.2 * (1 - trendClarity);
  return Math.max(0.15, Math.min(0.95, difficulty));
}
