/**
 * AI duel opponents — the cold-start fix. A live PvP queue is empty until there's
 * a crowd, so when no human is waiting we fill the match with a rating-appropriate
 * bot. The bot makes a *real* graded call (choice + confidence + reasoning) on the
 * same board and is scored by the identical pipeline (`gradeCall`), so a win
 * against it is earned. Bots are always flagged `isBot` and never faked as human.
 *
 * Server-side only — not mirrored to the mobile client (the phone never grades).
 */
import { duelName, type PlayerSlot } from "./duel";
import { chipsForProblem, buildReasoning } from "./reasoning-chips";
import { hashSeed, rng } from "./seed";
import type { ChoiceId, SolvedProblem } from "./types";

const BOT_PREFIX = "bot:";

export function isBotId(id: string): boolean {
  return id.startsWith(BOT_PREFIX);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Build a bot opponent near the player's rating. `duelMatchesPlayed` is high so
 * its rating reads as "established" — but the bot's own rating is never persisted,
 * it exists only to give the human a fair Elo update.
 */
export function makeBot(playerRating: number, seedStr: string): PlayerSlot {
  const r = rng(hashSeed(`${seedStr}:slot`));
  const spread = Math.round((r() - 0.5) * 120); // ±60 around the player
  const rating = clamp(playerRating + spread, 300, 2600);
  const id = `${BOT_PREFIX}${(hashSeed(seedStr) >>> 0).toString(36)}${Math.floor(r() * 1e6).toString(36)}`;
  return {
    id,
    name: duelName(id),
    duelRating: rating,
    duelMatchesPlayed: 60,
    isBot: true,
  };
}

export interface BotCall {
  choice: ChoiceId;
  confidence: number;
  reasoning: string;
}

/**
 * Decide the bot's call for a board. Skill scales with rating and is dragged down
 * by problem difficulty; confidence tracks that skill (so lower-rated bots are a
 * touch overconfident — and pay for it on Brier, just like a real beginner).
 * Deterministic per (round seed, bot id) so repeated server calls never flip it.
 */
export function botCall(problem: SolvedProblem, rating: number, seedStr: string): BotCall {
  const r = rng(hashSeed(seedStr));

  const base = 0.5 + (rating - 1000) / 1600;
  const difficultyDrag = (problem.difficulty - 0.5) * 0.35;
  const pCorrect = clamp(base - difficultyDrag, 0.18, 0.93);

  const choices = problem.choices.map((c) => c.id);
  let choice: ChoiceId;
  if (r() < pCorrect) {
    choice = problem.answer;
  } else {
    const wrong = choices.filter((c) => c !== problem.answer);
    choice = wrong.length ? wrong[Math.floor(r() * wrong.length)] : problem.answer;
  }

  const confidence = clamp(pCorrect + (r() - 0.5) * 0.16, 0.4, 0.92);

  const chips = chipsForProblem(problem).map((c) => c.label);
  const nPick = rating >= 1300 ? 3 : rating >= 1000 ? 2 : 1;
  const shuffled = [...chips].sort(() => r() - 0.5).slice(0, nPick);
  const reasoning = buildReasoning(shuffled, "") || "The setup looks balanced from here.";

  return { choice, confidence: +confidence.toFixed(2), reasoning };
}
