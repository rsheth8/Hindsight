/**
 * Investing concepts — tag problems & track per-concept mastery locally.
 * Feeds the skill tree on the Rank screen (no backend needed).
 */
import type { JournalEntry } from "@/lib/profile/store";
import type { DailyProblem } from "./types";

export type ConceptId = "momentum" | "volatility" | "drawdown" | "reversal" | "sizing";

export interface ConceptDef {
  id: ConceptId;
  label: string;
  icon: string;
  blurb: string;
}

export const CONCEPTS: ConceptDef[] = [
  { id: "momentum", label: "Momentum", icon: "📈", blurb: "Reading trend continuation vs. exhaustion." },
  { id: "volatility", label: "Volatility", icon: "⚡", blurb: "Sizing confidence when outcomes swing wide." },
  { id: "drawdown", label: "Drawdowns", icon: "📉", blurb: "Calls after pain — recovery vs. falling knife." },
  { id: "reversal", label: "Reversals", icon: "🔄", blurb: "When the chart and the outcome disagree." },
  { id: "sizing", label: "Conviction sizing", icon: "🎯", blurb: "Matching how sure you are to the evidence." },
];

function parsePct(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
}

/** Tag a problem from its visible setup (no look-ahead). */
export function conceptsForProblem(problem: DailyProblem): ConceptId[] {
  const tags = new Set<ConceptId>();
  const byLabel = Object.fromEntries(problem.metrics.map((m) => [m.label, m.value]));
  const ret6m = parsePct(byLabel["6-month return"] ?? "0");
  const vol = parsePct(byLabel["Annualized volatility"] ?? "0");
  const dd = parsePct(byLabel["Max drawdown (window)"] ?? "0");
  const vsMa = parsePct(byLabel["Vs 50-day average"] ?? "0");

  if (Math.abs(ret6m) > 8 || Math.abs(vsMa) > 5) tags.add("momentum");
  if (vol >= 35) tags.add("volatility");
  if (dd < -18) tags.add("drawdown");
  if (problem.difficulty >= 0.65) tags.add("sizing");
  tags.add("sizing"); // every call practices sizing

  return [...tags];
}

/** Infer concepts for a journal row (stored tags or heuristic from difficulty). */
export function conceptsForEntry(entry: JournalEntry): ConceptId[] {
  if (entry.concepts?.length) return entry.concepts;
  const tags = new Set<ConceptId>(["sizing"]);
  if (typeof entry.difficulty === "number" && entry.difficulty >= 0.7) tags.add("volatility");
  if (entry.forwardReturnPct !== undefined) {
    const big = Math.abs(entry.forwardReturnPct) >= 12;
    if (big) tags.add("momentum");
  }
  if (entry.brier > 0.2) tags.add("sizing");
  return [...tags];
}

export type MasteryLevel = "learning" | "building" | "sharp";

export interface ConceptMastery {
  id: ConceptId;
  label: string;
  icon: string;
  blurb: string;
  calls: number;
  /** 0–100 composite: calibration + reasoning */
  score: number;
  level: MasteryLevel;
}

function masteryLevel(score: number, calls: number): MasteryLevel {
  if (calls < 2 || score < 40) return "learning";
  if (score >= 70 && calls >= 4) return "sharp";
  return "building";
}

const calibScore = (brier: number) => Math.round(Math.max(0, Math.min(100, ((0.25 - brier) / 0.25) * 100)));

export function conceptMastery(history: JournalEntry[]): ConceptMastery[] {
  const buckets = new Map<ConceptId, JournalEntry[]>();
  for (const h of history) {
    for (const c of conceptsForEntry(h)) {
      if (!buckets.has(c)) buckets.set(c, []);
      buckets.get(c)!.push(h);
    }
  }

  return CONCEPTS.map((def) => {
    const rows = buckets.get(def.id) ?? [];
    const calls = rows.length;
    let score = 0;
    if (calls > 0) {
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      score = Math.round(avg(rows.map((h) => calibScore(h.brier))) * 0.45 + avg(rows.map((h) => h.reasoningScore)) * 100 * 0.55);
    }
    return {
      id: def.id,
      label: def.label,
      icon: def.icon,
      blurb: def.blurb,
      calls,
      score,
      level: masteryLevel(score, calls),
    };
  });
}
