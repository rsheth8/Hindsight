/**
 * The rating — the heart of Hindsight. A luck-resistant Elo where the number
 * only goes up through sustained good calibration + reasoning, not lucky wins.
 *
 *   S = 0.15·correctness + 0.45·calibration + 0.40·reasoning   (0–1)
 *   E = 1 / (1 + 10^((D − R)/400))                             (expected score)
 *   R' = R + K·(S − E)
 *
 * The luck filter: a correct-but-poorly-reasoned call has its *upside* clamped
 * to ≈0 ("right for the wrong reasons — lucky, +0"), while a well-reasoned call
 * that didn't pay off in-window still banks reasoning credit.
 */

export const START_RATING = 1000;
const D_FLOOR = 600;
const D_CEIL = 2200;

/** K-factor shrinks as the player accrues a track record (stabler rating). */
export function kFactor(gradedCount: number): number {
  if (gradedCount < 10) return 56; // provisional: moves fast
  if (gradedCount < 30) return 40;
  return 28;
}

/** Map a 0–1 difficulty to an Elo-scale opponent rating. */
export function difficultyToElo(difficulty: number): number {
  const d = Math.max(0, Math.min(1, difficulty));
  return Math.round(D_FLOOR + d * (D_CEIL - D_FLOOR));
}

export interface SkillInputs {
  correct: boolean;
  /** (confidence − outcome)² for the chosen answer, 0–1; lower is better */
  brier: number;
  /** AI reasoning grade 0–1 */
  reasoning: number;
}

/** Combined 0–1 skill score with the luck filter applied. */
export function skillScore({ correct, brier, reasoning }: SkillInputs): number {
  const correctness = correct ? 1 : 0;
  // Brier 0 → 1.0, 0.25 (coinflip) → 0.5, 1 → 0. Calibration credit.
  const calibration = Math.max(0, 1 - brier * 2);
  let s = 0.15 * correctness + 0.45 * calibration + 0.4 * reasoning;

  // Luck filter: right but weak reasoning → clamp the upside toward break-even.
  if (correct && reasoning < 0.4) {
    s = Math.min(s, 0.5 + reasoning * 0.25);
  }
  return Math.max(0, Math.min(1, s));
}

export interface RatingUpdate {
  newRating: number;
  delta: number;
  expected: number;
  score: number;
  earned: boolean;
}

/** During the provisional window, thin reasoning can lift but not sink the rating. */
export function provisionalReasoningFloor(gradedCount: number, reasoning: number): number {
  if (gradedCount < 10) return Math.max(reasoning, 0.5);
  return reasoning;
}

export function updateRating(args: {
  rating: number;
  gradedCount: number;
  difficulty: number;
  inputs: SkillInputs;
}): RatingUpdate {
  const { rating, gradedCount, difficulty, inputs } = args;
  const D = difficultyToElo(difficulty);
  const expected = 1 / (1 + 10 ** ((D - rating) / 400));
  const scoreInputs: SkillInputs = {
    ...inputs,
    reasoning: provisionalReasoningFloor(gradedCount, inputs.reasoning),
  };
  const score = skillScore(scoreInputs);
  const k = kFactor(gradedCount);
  const delta = Math.round(k * (score - expected));
  const earned = inputs.correct && inputs.reasoning >= 0.5;
  return { newRating: Math.max(100, rating + delta), delta, expected, score, earned };
}

/**
 * Provisional display: under 10 graded calls the rating is real but shown as a
 * range so one lucky streak can't look like a high score.
 */
export function isProvisional(gradedCount: number): boolean {
  return gradedCount < 10;
}
