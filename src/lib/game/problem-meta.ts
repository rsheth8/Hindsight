/** Labels and helpers for multi-type practice drills. */
import type { DailyProblem, ProblemType } from "./types";

export interface SpecialDrillMeta {
  type: ProblemType;
  emoji: string;
  label: string;
  sub: string;
}

export const SPECIAL_DRILLS: SpecialDrillMeta[] = [
  { type: "spot-the-flaw", emoji: "🔍", label: "Spot the flaw", sub: "Find the reasoning error" },
  { type: "options-greeks", emoji: "📐", label: "Options & Greeks", sub: "Calls, puts, spreads & risk" },
  { type: "futures-basics", emoji: "📊", label: "Futures & leverage", sub: "Gap risk, rolls & notional" },
  { type: "calibration-bet", emoji: "🎯", label: "Calibration bet", sub: "Size confidence to base rates" },
];

export function isSpecialDrill(type: ProblemType): boolean {
  return type !== "read-the-setup";
}

export function problemTypeLabel(type: ProblemType): string {
  const drill = SPECIAL_DRILLS.find((d) => d.type === type);
  if (drill) return drill.label;
  if (type === "read-the-setup") return "Read the setup";
  return type;
}

/** Reveal copy when forward return % isn't meaningful (synthetic drills). */
export function specialRevealLine(problem: DailyProblem, correctLabel: string): string {
  switch (problem.type) {
    case "spot-the-flaw":
      return `The main flaw was: ${correctLabel}.`;
    case "options-greeks":
      return `The dominant risk driver: ${correctLabel}.`;
    case "futures-basics":
      return `The key lesson: ${correctLabel}.`;
    case "calibration-bet":
      return problem.baseRateHint
        ? `Correct read: ${correctLabel}. ${problem.baseRateHint}`
        : `Correct read: ${correctLabel}.`;
    default:
      return `Correct answer: ${correctLabel}.`;
  }
}
