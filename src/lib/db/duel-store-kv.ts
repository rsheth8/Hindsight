/**
 * Production duel store — Vercel KV / Upstash Redis (same KV_REST_API_* vars as
 * the submission store). Matches are individual keys with a TTL so abandoned
 * lobbies expire on their own; the matchmaking queue is a single small array.
 */
import { kv } from "@vercel/kv";
import type { DuelMatch } from "@/lib/game/duel";
import type { QueueEntry } from "./duel-types";

const MATCH_PREFIX = "hindsight:duel:match:";
const QUEUE_KEY = "hindsight:duel:queue:v1";
/** Matches live at most ~3 days (covers a 72h async Best-of-3). */
const MATCH_TTL_SECONDS = 3 * 24 * 60 * 60;

export async function kvGetMatch(id: string): Promise<DuelMatch | null> {
  return (await kv.get<DuelMatch>(MATCH_PREFIX + id)) ?? null;
}

export async function kvSaveMatch(match: DuelMatch): Promise<void> {
  await kv.set(MATCH_PREFIX + match.id, match, { ex: MATCH_TTL_SECONDS });
}

export async function kvGetQueue(): Promise<QueueEntry[]> {
  return (await kv.get<QueueEntry[]>(QUEUE_KEY)) ?? [];
}

export async function kvSaveQueue(entries: QueueEntry[]): Promise<void> {
  await kv.set(QUEUE_KEY, entries);
}
