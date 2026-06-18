/**
 * Grade a single call into a duel RoundGrade — reuses the exact solo scoring:
 * Brier calibration + AI reasoning grade + the luck-filtered skill score. Shared
 * by the duel commit route so head-to-head is graded identically to the daily.
 */
import { brierFor } from "@/lib/game/calibration";
import { skillScore } from "@/lib/game/rating";
import type { RoundGrade } from "@/lib/game/duel";
import type { ChoiceId, SolvedProblem } from "@/lib/game/types";
import { gradeReasoning } from "./grade";

export async function gradeCall(args: {
  problem: SolvedProblem;
  choice: ChoiceId;
  confidence: number;
  reasoning: string;
}): Promise<RoundGrade> {
  const { problem, choice, confidence, reasoning } = args;
  const correct = choice === problem.answer;
  const brier = brierFor(confidence, correct);
  const r = await gradeReasoning({ reasoning, problem, choice, confidence });
  const score = skillScore({ correct, brier, reasoning: r.score });
  return {
    choice,
    confidence,
    correct,
    brier: +brier.toFixed(4),
    reasoning: +r.score.toFixed(2),
    reasoningNotes: r.notes,
    score: +score.toFixed(3),
  };
}
