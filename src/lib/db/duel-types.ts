import type { DuelMode, DuelTempo } from "@/lib/game/duel";

/** A player parked in matchmaking, waiting for an opponent to join their match. */
export interface QueueEntry {
  matchId: string;
  playerId: string;
  mode: DuelMode;
  tempo: DuelTempo;
  rated: boolean;
  rating: number;
  enqueuedAt: string;
}
