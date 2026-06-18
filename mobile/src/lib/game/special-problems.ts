/**
 * Dispatch extended practice problem types.
 */
import type { ProblemType, SolvedProblem } from "./types";
import { buildSpotTheFlawProblem } from "./problems/spot-the-flaw";
import { buildOptionsGreeksProblem } from "./problems/options-greeks";
import { buildFuturesBasicsProblem } from "./problems/futures-basics";
import { buildCalibrationBetProblem } from "./problems/calibration-bet";

export const SPECIAL_TYPES: ProblemType[] = [
  "spot-the-flaw",
  "options-greeks",
  "futures-basics",
  "calibration-bet",
];

export function isSpecialType(t: string): t is ProblemType {
  return SPECIAL_TYPES.includes(t as ProblemType);
}

export async function getSpecialProblem(type: ProblemType, seed: string): Promise<SolvedProblem> {
  switch (type) {
    case "spot-the-flaw":
      return buildSpotTheFlawProblem(seed);
    case "options-greeks":
      return buildOptionsGreeksProblem(seed);
    case "futures-basics":
      return buildFuturesBasicsProblem(seed);
    case "calibration-bet":
      return buildCalibrationBetProblem(seed);
    default:
      throw new Error(`Unknown special type: ${type}`);
  }
}

export function specialProblemId(type: ProblemType, seed: string): string {
  switch (type) {
    case "spot-the-flaw":
      return `flaw-${seed}`;
    case "options-greeks":
      return `options-${seed}`;
    case "futures-basics":
      return `futures-${seed}`;
    case "calibration-bet":
      return `calbet-${seed}`;
    default:
      return seed;
  }
}
