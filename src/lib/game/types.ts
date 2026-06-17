/**
 * Core domain types for Hindsight — the daily investing-judgment game.
 *
 * A problem shows an *anonymized* real-market setup (mini price history + a few
 * key metrics) as of some past "decision date", and asks the player for a
 * forward judgment + a confidence. We grade the *decision*, not the outcome:
 * calibration (Brier) and reasoning weigh far more than being right.
 */

export type ProblemType = "read-the-setup";

export interface Pricepoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  close: number;
}

export interface SetupMetric {
  label: string;
  value: string;
  /** Optional plain-language hint shown on the reveal, not before. */
  hint?: string;
}

export type ChoiceId = "A" | "B" | "C";

export interface Choice {
  id: ChoiceId;
  label: string;
}

/** What gets sent to the client. Never includes the answer or the ticker. */
export interface DailyProblem {
  id: string;
  date: string; // the puzzle date (today), date-seeded
  type: ProblemType;
  /** anonymized series the player sees (history up to the decision date) */
  series: PricepointLite[];
  metrics: SetupMetric[];
  prompt: string;
  choices: Choice[];
  /** how far forward the judgment looks, in trading days, for display */
  horizonLabel: string;
  /** 0–1, drives Elo expected score and the difficulty chip */
  difficulty: number;
  /** synthetic until we have real telemetry; share of players per choice */
  crowd: Record<ChoiceId, number>;
  /** true when built from live FMP data, false when from the fallback bank */
  live: boolean;
}

/** Price point with the value normalized to an index (start = 100) to anonymize. */
export interface PricepointLite {
  t: number; // step index
  v: number; // indexed value
}

/** The full server-side problem, including the hidden answer + reveal payload. */
export interface SolvedProblem extends DailyProblem {
  answer: ChoiceId;
  /** the real ticker + company, revealed after submit */
  reveal: {
    ticker: string;
    company: string;
    decisionDate: string;
    resolveDate: string;
    forwardReturnPct: number;
    /** continuation series (decision date → resolve date), indexed to match */
    continuation: PricepointLite[];
  };
}

export interface Submission {
  problemId: string;
  choice: ChoiceId;
  /** 0.5–1.0 — how sure the player is in the chosen answer */
  confidence: number;
  reasoning: string;
  /** the player's rating before this problem, for the Elo update */
  rating: number;
  gradedCount: number;
}

export interface GradeResult {
  correct: boolean;
  answer: ChoiceId;
  /** (confidence − outcome)² for the chosen answer; lower is better */
  brier: number;
  /** AI (or heuristic) reasoning grade, 0–1 */
  reasoning: number;
  reasoningNotes: string;
  /** combined skill score 0–1 used by the Elo update */
  score: number;
  /** Elo delta applied to the player's rating */
  ratingDelta: number;
  newRating: number;
  /** whether the win was "earned" (good reasoning) → confetti */
  earned: boolean;
  /** AI explanation at the player's depth */
  explanation: string;
  reveal: SolvedProblem["reveal"];
  crowd: Record<ChoiceId, number>;
}
