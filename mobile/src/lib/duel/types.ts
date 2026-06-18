/**
 * Client view of a duel — mirrors the server's `PublicDuelMatch` serializer in
 * src/lib/game/duel-service.ts (manual mirror; the wire shape is the contract).
 */
import type { ChoiceId, SolvedProblem } from "../game/types";
import type { DuelClock, DuelMode, DuelTempo, MatchState, PlayerSlot, RoundGrade } from "../game/duel";

export interface PublicRound {
  index: number;
  state: "active" | "complete";
  phase?: "commit" | "rebuttal";
  deadlineAt?: string;
  rebuttalDeadlineAt?: string;
  convertedToAsync?: boolean;
  youCommitted: boolean;
  opponentCommitted: boolean;
  youRebutted?: boolean;
  opponentRebutted?: boolean;
  winnerId?: string | null;
  grades?: Record<string, RoundGrade>;
  yourReasoning?: string;
  opponentReasoning?: string;
  reveal?: SolvedProblem["reveal"];
  answer?: ChoiceId;
}

export interface PublicDuelMatch {
  id: string;
  mode: DuelMode;
  modeName: string;
  tempo: DuelTempo;
  clock: DuelClock | null;
  rated: boolean;
  state: MatchState;
  currentRound: number;
  roundsTotal: number;
  winsNeeded: number;
  players: PlayerSlot[];
  rounds: PublicRound[];
  winnerId?: string | null;
  challengeCode?: string;
  hideChart?: boolean;
  you: string;
}

export interface CreateResult {
  match: PublicDuelMatch;
  joined: boolean;
}

export interface DuelRealtimeConfig {
  enabled: boolean;
  transport: "ably" | "polling";
  channel: string;
  tokenRequest?: Record<string, unknown>;
}
