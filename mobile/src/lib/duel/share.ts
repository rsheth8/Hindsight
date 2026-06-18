/** Duel share text + join links (mobile). */
import { API_BASE } from "../api";

export interface DuelShareInput {
  won: boolean;
  draw: boolean;
  delta: number;
  ratingAfter: number;
  opponentName: string;
  modeName: string;
  yourScore?: number;
  oppScore?: number;
}

export function duelJoinUrl(code: string): string {
  const base = API_BASE.replace(/\/$/, "");
  return `${base}/rank?duel=${encodeURIComponent(code)}`;
}

export function duelShareText(input: DuelShareInput): string {
  const host = API_BASE.replace(/^https?:\/\//, "");
  const outcome = input.draw ? "drew" : input.won ? "beat" : "lost to";
  const vs = input.draw ? "in a draw" : input.opponentName;
  const score =
    input.yourScore != null && input.oppScore != null
      ? ` (${input.yourScore.toFixed(2)} vs ${input.oppScore.toFixed(2)})`
      : "";
  return (
    `Hindsight Duel · ${input.modeName}\n` +
    `I ${outcome} ${vs}${score}\n` +
    `${input.delta >= 0 ? "+" : ""}${input.delta} duel rating → ${input.ratingAfter}\n` +
    `Sharper read wins — judgment, never returns.\n` +
    `play › ${host}`
  );
}

export function duelChallengeText(code: string, modeName: string): string {
  return `Join my ${modeName} duel on Hindsight:\n${duelJoinUrl(code)}`;
}
