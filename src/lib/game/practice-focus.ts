/**
 * Practice focus helpers — safe for client + server bundles.
 */
import type { JournalEntry } from "@/lib/profile/store";
import { insights } from "./progress";

export type PracticeFocus = "hard" | "high-vol" | "boundary" | "reversal" | "mixed";

const FOCUS_LABELS: Record<PracticeFocus, string> = {
  hard: "hard setups",
  "high-vol": "high-volatility names",
  boundary: "borderline ±10% calls",
  reversal: "trend reversals",
  mixed: "a mixed bag",
};

export function focusLabel(focus: PracticeFocus): string {
  return FOCUS_LABELS[focus];
}

export function derivePracticeFocus(history: JournalEntry[]): PracticeFocus {
  if (history.length < 3) return "mixed";

  const titles = new Set(insights(history).map((t) => t.title));
  if (titles.has("Hard setups trip you up") || titles.has("Too many lucky wins")) return "hard";
  if (titles.has("You run overconfident")) return "boundary";

  const tagged = history.filter((h) => typeof h.difficulty === "number");
  if (tagged.length >= 4) {
    const hard = tagged.filter((h) => (h.difficulty as number) >= 0.7);
    const easy = tagged.filter((h) => (h.difficulty as number) < 0.7);
    if (hard.length >= 2 && easy.length >= 2) {
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      if (avg(hard.map((h) => h.brier)) - avg(easy.map((h) => h.brier)) > 0.06) return "hard";
    }
  }

  const avgConf = history.reduce((a, h) => a + h.confidence, 0) / history.length;
  const accuracy = history.filter((h) => h.correct).length / history.length;
  if (avgConf - accuracy > 0.12) return "boundary";

  return "mixed";
}

export function practiceFocusBlurb(focus: PracticeFocus): string {
  switch (focus) {
    case "hard":
      return "Your journal says murky setups cost you — today's practice reps will lean hard.";
    case "boundary":
      return "You tend to overshoot confidence on close calls — we'll serve more borderline ±10% setups.";
    case "high-vol":
      return "Jumpier names widen outcomes — practicing high-vol setups sharpens sizing.";
    case "reversal":
      return "Trend reversals are where conviction gets tested — we'll bias toward those.";
    default:
      return "Building your read across a mix of setups — play a few and we'll narrow in.";
  }
}
