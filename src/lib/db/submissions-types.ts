import type { ChoiceId } from "@/lib/game/types";

export interface StoredSubmission {
  id: string;
  deviceId: string;
  problemId: string;
  problemDate: string;
  choice: ChoiceId;
  confidence: number;
  correct: boolean;
  brier: number;
  reasoningScore: number;
  ratingDelta: number;
  createdAt: string;
}
