/**
 * Calibration — the visible "you're getting better" number that a tip-service
 * can't fake.
 *
 * Brier score (Brier, 1950) = mean((p − outcome)²), where p is the probability
 * you assigned to YOUR chosen answer being right and outcome ∈ {0,1}. It is a
 * strictly proper scoring rule — you minimize it only by reporting your true
 * belief. 0 = perfect, 1 = confidently wrong every time.
 *
 * The puzzle has THREE outcomes, so a pure guess on your chosen answer is right
 * ~1/3 of the time. The no-information ("climatology") forecast is therefore
 * p = 1/3, whose Brier equals the outcome variance p(1−p) = (1/3)(2/3) = 2/9 ≈
 * 0.222 (the "uncertainty" term in Murphy's decomposition). We use that as the
 * reference baseline so the readiness skill score is the textbook Brier Skill
 * Score, BSS = 1 − Brier/Brier_ref: "0 readiness" means "no better than
 * guessing", never "got lucky".
 */

/** Probability of a pure guess among the three choices being right. */
export const GUESS_CONFIDENCE = 1 / 3;
/** Brier of always forecasting the base rate — the no-skill reference. */
export const REFERENCE_BRIER = GUESS_CONFIDENCE * (1 - GUESS_CONFIDENCE); // 2/9 ≈ 0.222

export interface ResolvedCall {
  /** probability the player assigned to their chosen answer being correct, 1/3–1 */
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

/**
 * Readiness skill score, 0–1 — the Brier Skill Score vs the no-skill baseline.
 * Perfect (Brier 0) → 1; guessing (Brier = REFERENCE_BRIER) → 0; worse → 0.
 * Drives the 0–100 readiness display and per-concept mastery.
 */
export function calibrationSkill(brier: number): number {
  return clamp01((REFERENCE_BRIER - brier) / REFERENCE_BRIER);
}

/**
 * Calibration credit, 0–1 — the calibration axis of the rating's skill score.
 * Centered so the no-skill baseline scores 0.5 (neutral against the Elo
 * expectation): perfect → 1, guessing (REFERENCE_BRIER) → 0.5, twice as bad → 0.
 */
export function calibrationCredit(brier: number): number {
  return clamp01(1 - brier / (2 * REFERENCE_BRIER));
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
  // Brier skill score → 0–100; guessing (REFERENCE_BRIER) → 0, perfect → 100.
  const skill = calibrationSkill(brier) * 100;
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
