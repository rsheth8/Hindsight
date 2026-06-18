/**
 * Talks to the Hindsight backend (the Next.js app's /api routes). The backend
 * holds the FMP + Anthropic keys; the phone never sees them.
 */
import type { DailyProblem, GradeResult, ProblemType } from "./game/types";
import type { Depth } from "./grade-types";
import type { PracticeFocus } from "./game/practice";

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://localhost:3000";

export async function fetchDaily(): Promise<DailyProblem> {
  const res = await fetch(`${API_BASE}/api/daily`);
  if (!res.ok) throw new Error(`daily ${res.status}`);
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data as DailyProblem;
}

export async function fetchPractice(seed: string, focus: PracticeFocus): Promise<DailyProblem> {
  const q = new URLSearchParams({ seed, focus });
  const res = await fetch(`${API_BASE}/api/practice?${q}`);
  if (!res.ok) throw new Error(`practice ${res.status}`);
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data as DailyProblem;
}

export interface BlindReplayResponse {
  problem: DailyProblem;
  visibleDays: number;
  maxDays: number;
  stepDays: number;
  canAdvance: boolean;
}

export async function fetchBlindReplay(seed: string, focus: PracticeFocus, visible: number): Promise<BlindReplayResponse> {
  const q = new URLSearchParams({ seed, focus, visible: String(visible) });
  const res = await fetch(`${API_BASE}/api/blind-replay?${q}`);
  if (!res.ok) throw new Error(`blind ${res.status}`);
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data as BlindReplayResponse;
}

export interface GradePayload {
  choice: "A" | "B" | "C";
  confidence: number;
  reasoning: string;
  rating: number;
  gradedCount: number;
  depth: Depth;
  deviceId?: string;
  practice?: { seed: string; focus: PracticeFocus };
  blindReplay?: { seed: string; focus: PracticeFocus; visibleDays: number };
  special?: { type: ProblemType; seed: string };
}

export async function fetchSpecialProblem(type: ProblemType, seed: string): Promise<DailyProblem> {
  const q = new URLSearchParams({ seed, type });
  const res = await fetch(`${API_BASE}/api/special-problem?${q}`);
  if (!res.ok) throw new Error(`special ${res.status}`);
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data as DailyProblem;
}

export async function gradeSubmission(payload: GradePayload): Promise<GradeResult> {
  const res = await fetch(`${API_BASE}/api/grade`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data?.error) throw new Error(data?.error || `grade ${res.status}`);
  return data as GradeResult;
}
