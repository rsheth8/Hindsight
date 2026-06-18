/**
 * Calibration bet — explicit probability framing on a statement.
 */
import { buildProblemForSeed } from "../daily";
import { seededRand } from "../seeded-rand";
import type { SolvedProblem } from "../types";

const FRAMES = [
  {
    prefix: "This large-cap setup beats the index over the next quarter.",
    baseRate: "Historically, ~55% of similar survivors beat the index in a quarter.",
  },
  {
    prefix: "After a −20% drawdown, this name recovers to new highs within 6 months.",
    baseRate: "Base rate for similar drawdowns: ~35% reach new highs within 6 months.",
  },
  {
    prefix: "High-volatility week ahead — this stock moves more than 10% either direction.",
    baseRate: "Similar vol regimes: ~40% see a >10% weekly move.",
  },
];

export async function buildCalibrationBetProblem(seed: string): Promise<SolvedProblem> {
  const base = await buildProblemForSeed(`cal-${seed}`);
  const r = seededRand(seed);
  const frame = FRAMES[Math.floor(r() * FRAMES.length)]!;

  return {
    ...base,
    id: `calbet-${seed}`,
    type: "calibration-bet",
    prompt: `${frame.prefix} How confident are you — and what's your call?`,
    baseRateHint: frame.baseRate,
    difficulty: Math.min(0.85, base.difficulty + 0.05),
  };
}
