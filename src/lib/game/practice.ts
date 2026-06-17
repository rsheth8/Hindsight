/**
 * Practice mode — server-side problem selection biased toward weak spots.
 */
import { buildProblemForSeed } from "./daily";
import { hashSeed } from "./seed";
import type { SolvedProblem } from "./types";
import { derivePracticeFocus, focusLabel, practiceFocusBlurb, type PracticeFocus } from "./practice-focus";

export type { PracticeFocus } from "./practice-focus";
export { derivePracticeFocus, focusLabel, practiceFocusBlurb };

function parsePct(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
}

export function problemTags(p: SolvedProblem): PracticeFocus[] {
  const tags: PracticeFocus[] = [];
  if (p.difficulty >= 0.7) tags.push("hard");
  const vol = parsePct(p.metrics.find((m) => m.label.includes("volatility"))?.value ?? "0");
  if (vol >= 38) tags.push("high-vol");
  const fwd = Math.abs(p.reveal.forwardReturnPct);
  if (fwd >= 8 && fwd <= 12) tags.push("boundary");
  const series = p.series;
  const trendUp = series[series.length - 1].v >= series[0].v;
  const outcomeUp = p.reveal.forwardReturnPct >= 0;
  if (trendUp !== outcomeUp && Math.abs(p.reveal.forwardReturnPct) >= 10) tags.push("reversal");
  if (tags.length === 0) tags.push("mixed");
  return tags;
}

function scoreForFocus(tags: PracticeFocus[], focus: PracticeFocus): number {
  if (focus === "mixed") return tags.includes("mixed") ? 1 : 0.5;
  if (tags.includes(focus)) return 2;
  if (focus === "hard" && tags.includes("high-vol")) return 1;
  if (focus === "boundary" && tags.includes("hard")) return 0.75;
  return 0;
}

export async function getPracticeProblem(seedKey: string, focus: PracticeFocus): Promise<SolvedProblem> {
  const tries = 8;
  let best: SolvedProblem | null = null;
  let bestScore = -1;

  for (let i = 0; i < tries; i++) {
    const sk = `${seedKey}-${i}`;
    const candidate = await buildProblemForSeed(sk);
    const tags = problemTags(candidate);
    const score = scoreForFocus(tags, focus) + (hashSeed(sk) % 1000) / 10000;
    if (score > bestScore) {
      bestScore = score;
      best = { ...candidate, id: `practice-${sk}`, date: seedKey };
    }
    if (score >= 2) break;
  }

  return best!;
}
