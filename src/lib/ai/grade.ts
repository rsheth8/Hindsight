/**
 * Grades the player's *reasoning* (the why), and writes the reveal explanation
 * at the player's depth. An LLM grades against a fixed rubric — the thing no
 * trivia app can do. Falls back to a transparent heuristic with no key.
 */
import { aiMessage, hasAnthropicKey } from "./client";
import type { ChoiceId, SetupMetric, SolvedProblem } from "@/lib/game/types";

export type Depth = "learn" | "analyst" | "quant";

export interface ReasoningGrade {
  score: number; // 0–1
  notes: string;
}

const RUBRIC = `You grade an investing student's written reasoning for a "read the setup" judgment puzzle.
They saw an anonymized 6-month price chart + a few technical metrics, then predicted the next 3 months.
Grade ONLY the quality of their reasoning process, NOT whether their answer matched the outcome
(short-horizon outcomes are mostly noise — we never reward luck).

Score 0.0–1.0 on these, then average:
- Did they cite the actual evidence on screen (trend, momentum vs 50-day, volatility, drawdown, distance from high)?
- Did they weigh a counter-thesis / acknowledge uncertainty (not just one-sided bravado)?
- Did they state what would change their mind, or size their confidence to the evidence?
- Is the logic coherent rather than a guess, a vibe, or "it'll go up because stocks go up"?

Empty, joke, or content-free answers ("idk", "🚀", "feels right") score ≤ 0.15.
Reply with STRICT JSON only: {"score": <0..1>, "notes": "<=240 chars, second person, specific and kind>"}`;

export async function gradeReasoning(args: {
  reasoning: string;
  problem: SolvedProblem;
  choice: string;
  confidence: number;
}): Promise<ReasoningGrade> {
  const { reasoning, problem, choice, confidence } = args;
  if (!hasAnthropicKey()) return heuristicGrade(reasoning);

  const context = JSON.stringify({
    metrics: problem.metrics,
    prompt: problem.prompt,
    choices: problem.choices,
    playerChoice: choice,
    playerConfidence: confidence,
  });

  try {
    const raw = await aiMessage({
      tier: "smart",
      maxTokens: 300,
      temperature: 0,
      system: [
        { type: "text", text: RUBRIC },
        { type: "text", text: `Setup context:\n${context}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: `Student reasoning:\n"""${reasoning.slice(0, 1200)}"""` }],
    });
    const parsed = JSON.parse(extractJson(raw)) as ReasoningGrade;
    return {
      score: clamp01(parsed.score),
      notes: parsed.notes?.slice(0, 280) || "Graded.",
    };
  } catch (err) {
    console.error("[grade] AI reasoning grade failed, heuristic fallback:", err);
    return heuristicGrade(reasoning);
  }
}

export async function explainReveal(args: {
  problem: SolvedProblem;
  correct: boolean;
  choice: ChoiceId;
  depth: Depth;
}): Promise<string> {
  const { problem, correct, choice, depth } = args;
  if (!hasAnthropicKey()) return heuristicExplanation(problem, correct, choice);

  const depthGuide = {
    learn: "Explain like a friendly coach to a beginner. Short sentences, define any jargon.",
    analyst: "Explain to an engaged retail investor. Use proper terms, be concise.",
    quant: "Explain to a sophisticated investor. Be precise and dense; reference base rates.",
  }[depth];

  const correctLabel = problem.choices.find((c) => c.id === problem.answer)?.label;
  const playerLabel = problem.choices.find((c) => c.id === choice)?.label;

  const context = JSON.stringify({
    metrics: problem.metrics,
    outcome: problem.reveal,
    correctAnswer: correctLabel,
    playerChose: playerLabel,
    forwardReturnPct: problem.reveal.forwardReturnPct,
  });

  const wrongGuide = correct
    ? "Affirm what they read well, then one nuance they could still weigh next time."
    : `The player was WRONG. Your first sentence must name their bucket ("${playerLabel}") vs the correct bucket ("${correctLabel}") and the actual ${problem.reveal.forwardReturnPct}% move. Then explain which on-screen signals supported the correct call and why their read was tempting but off. Do not hand-wave with "ambiguous" without citing evidence.`;

  try {
    return await aiMessage({
      tier: "fast",
      maxTokens: 360,
      temperature: 0.4,
      system: [
        {
          type: "text",
          text: `You are Hindsight's coach. ${depthGuide} In 3–5 sentences, explain what the setup was signaling and why the 3-month move happened, focused on the *judgment*, not a stock tip. Never give buy/sell advice. Be direct but encouraging. The ticker was ${problem.reveal.ticker} (${problem.reveal.company}). ${wrongGuide}`,
        },
        { type: "text", text: `Reveal context:\n${context}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: `The player was ${correct ? "right" : "wrong"}. Give the coach's read.` }],
    });
  } catch (err) {
    console.error("[grade] AI explanation failed, heuristic fallback:", err);
    return heuristicExplanation(problem, correct, choice);
  }
}

// ---- heuristic fallbacks (no key) -------------------------------------------

function heuristicGrade(reasoning: string): ReasoningGrade {
  const text = reasoning.trim();
  const words = text ? text.split(/\s+/).length : 0;
  if (words < 4) return { score: 0.12, notes: "Too short to grade. Spell out the evidence you're leaning on next time." };

  const lc = text.toLowerCase();
  const cites = /(trend|momentum|volatil|drawdown|average|50-day|high|support|resistance|return|range|risk)/.test(lc);
  const counter = /(however|but|although|risk|could|might|uncertain|mixed|if|unless|downside|upside|counter|limited edge)/.test(lc);
  const change = /(change my mind|would change|if it|break|invalidate|reconsider|wrong if)/.test(lc);

  let score = 0.3;
  if (words >= 12) score += 0.15;
  if (cites) score += 0.25;
  if (counter) score += 0.18;
  if (change) score += 0.17;
  score = clamp01(score);

  const notes = !cites
    ? "Solid start — name the specific metrics (momentum, volatility, drawdown) you're reading."
    : counter
    ? "Good — you cited evidence and weighed the other side. Add what would change your mind."
    : "You cited evidence. Now weigh the counter-thesis before you commit your confidence.";
  return { score, notes };
}

function parseMetricPct(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
}

function setupSignalLine(metrics: SetupMetric[]): string {
  const ret = parseMetricPct(metrics.find((m) => m.label.includes("6-month"))?.value ?? "0");
  const vol = parseMetricPct(metrics.find((m) => m.label.includes("volatility"))?.value ?? "0");
  const vsMa = metrics.find((m) => m.label.includes("50-day"))?.value ?? "";
  const parts: string[] = [];
  if (ret > 8) parts.push("strong trailing momentum");
  else if (ret < -8) parts.push("a weak trailing trend");
  if (vol >= 35) parts.push("high volatility (wider outcome bands)");
  if (vsMa.includes("+")) parts.push("price above the 50-day average");
  else if (vsMa.includes("-")) parts.push("price below the 50-day average");
  return parts.length ? `The visible setup showed ${parts.join(", ")}.` : "The chart mixed bullish and bearish cues.";
}

function heuristicExplanation(problem: SolvedProblem, correct: boolean, choice: ChoiceId): string {
  const r = problem.reveal;
  const correctLabel = problem.choices.find((c) => c.id === problem.answer)?.label ?? problem.answer;
  const playerLabel = problem.choices.find((c) => c.id === choice)?.label ?? choice;
  const ret = `${r.forwardReturnPct >= 0 ? "+" : ""}${r.forwardReturnPct}%`;
  const move =
    r.forwardReturnPct > 0 ? `rose ${ret}` : r.forwardReturnPct < 0 ? `fell ${ret}` : `finished near flat (${ret})`;
  const signals = setupSignalLine(problem.metrics);

  if (correct) {
    return `This was ${r.company} (${r.ticker}). Over 3 months it ${move}, landing in "${correctLabel}" — matching your call. ${signals} You read those cues in the right direction. What compounds is sizing confidence to the evidence, not chasing every move.`;
  }

  return `This was ${r.company} (${r.ticker}). You called "${playerLabel}", but the stock ${move} over 3 months, so the correct bucket was "${correctLabel}". ${signals} A common miss here: overweighting the recent trend or underweighting volatility when the forward window can still surprise. The goal isn't being right every time — it's calibrating how much each setup actually tells you.`;
}

function extractJson(s: string): string {
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  return a >= 0 && b > a ? s.slice(a, b + 1) : s;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
