/**
 * Calibration — the visible "you're getting better" number that a tip-service
 * can't fake. Brier score = mean((p − outcome)²). 0 = perfect, 0.25 = a coin
 * flip answered at 50%, 1 = confidently wrong every time. We turn it into a
 * friendly 0–100 readiness signal that respects sample size (you can't be
 * "ready" off three lucky calls).
 */

export interface ResolvedCall {
  /** probability the player assigned to their chosen answer being correct, 0.5–1 */
  confidence: number;
  correct: boolean;
}

export interface CalibrationSummary {
  resolved: number;
  accuracy: number | null;
  brier: number | null;
  /** avg(confidence) − accuracy; >0 overconfident, <0 underconfident */
  overconfidence: number | null;
  readiness: { score: number; label: string; blurb: string };
}

const MIN_SAMPLE = 10; // below this, readiness is capped — not enough evidence

/** Single-call Brier against the chosen answer. */
export function brierFor(confidence: number, correct: boolean): number {
  const p = clamp01(confidence);
  return (p - (correct ? 1 : 0)) ** 2;
}

export function summarize(calls: ResolvedCall[]): CalibrationSummary {
  const n = calls.length;
  if (n === 0) {
    return {
      resolved: 0,
      accuracy: null,
      brier: null,
      overconfidence: null,
      readiness: { score: 0, label: "Not started", blurb: "Make a few calls to start your track record." },
    };
  }

  let hits = 0;
  let brierSum = 0;
  let confSum = 0;
  for (const c of calls) {
    if (c.correct) hits += 1;
    brierSum += brierFor(c.confidence, c.correct);
    confSum += clamp01(c.confidence);
  }
  const accuracy = hits / n;
  const brier = brierSum / n;
  const overconfidence = confSum / n - accuracy;
  return { resolved: n, accuracy, brier, overconfidence, readiness: readinessFrom(n, brier) };
}

function readinessFrom(n: number, brier: number): CalibrationSummary["readiness"] {
  // Skill from Brier: 0.25 (random) → 0, 0.0 (perfect) → 100.
  const skill = clamp01((0.25 - brier) / 0.25) * 100;
  const evidence = Math.min(n, MIN_SAMPLE) / MIN_SAMPLE;
  const score = Math.round(skill * evidence);

  if (n < MIN_SAMPLE) {
    return {
      score,
      label: "Warming up",
      blurb: `${n}/${MIN_SAMPLE} calls in. Readiness needs a real sample to mean anything.`,
    };
  }
  if (score >= 75) return { score, label: "Well-calibrated", blurb: "Your confidence tracks reality. That's earned conviction." };
  if (score >= 50) return { score, label: "Finding your footing", blurb: "Decent calibration. Tighten the calls you get wrong." };
  if (score >= 25) return { score, label: "Miscalibrated", blurb: "Confidence and outcomes don't line up yet. This is the place to fix that — for free." };
  return { score, label: "Overconfident", blurb: "Confident but often wrong. The cheapest possible place to learn that lesson." };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
