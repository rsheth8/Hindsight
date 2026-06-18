/**
 * Duel REST client. The Next.js backend owns match state + grading; the phone is
 * a thin client (same pattern as the daily game). Transport is REST polling in
 * V1 — see useDuelMatch — with an Ably upgrade path on the server.
 */
import { API_BASE } from "../api";
import type { ChoiceId, DailyProblem } from "../game/types";
import type { DuelClock, DuelMode, DuelTempo } from "../game/duel";
import type { CreateResult, PublicDuelMatch } from "./types";

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error(data?.error || `duel ${res.status}`);
  return data;
}

export interface DuelIdentity {
  deviceId: string;
  name: string;
  duelRating: number;
  duelMatchesPlayed: number;
}

export async function createDuel(args: {
  mode: DuelMode;
  tempo: DuelTempo;
  clock: DuelClock | null;
  rated: boolean;
  kind: "queue" | "friend";
  identity: DuelIdentity;
}): Promise<CreateResult> {
  const res = await fetch(`${API_BASE}/api/duel/match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      mode: args.mode,
      tempo: args.tempo,
      clock: args.clock,
      rated: args.rated,
      kind: args.kind,
      ...args.identity,
    }),
  });
  return (await readJson(res)) as CreateResult;
}

export async function joinDuel(matchId: string, identity: DuelIdentity): Promise<PublicDuelMatch> {
  const res = await fetch(`${API_BASE}/api/duel/match/${matchId}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(identity),
  });
  return (await readJson(res)) as PublicDuelMatch;
}

export async function getDuel(matchId: string, deviceId: string): Promise<PublicDuelMatch> {
  const q = new URLSearchParams({ deviceId });
  const res = await fetch(`${API_BASE}/api/duel/match/${matchId}?${q}`);
  return (await readJson(res)) as PublicDuelMatch;
}

export async function getDuelProblem(
  matchId: string,
  deviceId: string,
): Promise<{ problem: DailyProblem; round: number; deadlineAt?: string }> {
  const q = new URLSearchParams({ deviceId });
  const res = await fetch(`${API_BASE}/api/duel/match/${matchId}/problem?${q}`);
  return (await readJson(res)) as { problem: DailyProblem; round: number; deadlineAt?: string };
}

export async function commitDuel(
  matchId: string,
  deviceId: string,
  call: { choice: ChoiceId; confidence: number; reasoning: string },
): Promise<PublicDuelMatch> {
  const res = await fetch(`${API_BASE}/api/duel/match/${matchId}/commit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId, ...call }),
  });
  return (await readJson(res)) as PublicDuelMatch;
}

export async function forfeitDuel(matchId: string, deviceId: string): Promise<PublicDuelMatch> {
  const res = await fetch(`${API_BASE}/api/duel/match/${matchId}/forfeit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  return (await readJson(res)) as PublicDuelMatch;
}
