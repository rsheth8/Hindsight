/**
 * Duel persistence — matches + the matchmaking queue. Uses Vercel KV / Upstash
 * when KV_REST_API_* are set; a local JSON file otherwise (so duels run in dev
 * without any cloud setup, same graceful-fallback pattern as the crowd store).
 *
 * Identity is the anonymous device id today; swap for account ids when accounts
 * land (see docs/duel-design.md → Clerk). The store is deliberately small and
 * last-write-wins — fine for the V1 player density; revisit locking at scale.
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { DuelMatch, DuelMode, DuelTempo } from "@/lib/game/duel";
import { hasSubmissionStore } from "@/lib/env";
import type { QueueEntry } from "./duel-types";
import { kvGetMatch, kvGetQueue, kvSaveMatch, kvSaveQueue } from "./duel-store-kv";

export type { QueueEntry } from "./duel-types";

interface DuelDbFile {
  matches: Record<string, DuelMatch>;
  queue: QueueEntry[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "duels.json");
const MAX_MATCHES = 5000;

let cache: DuelDbFile | null = null;

/** @internal — reset in-memory cache between tests */
export function _resetDuelCacheForTests(): void {
  cache = null;
}

async function loadFileDb(): Promise<DuelDbFile> {
  if (cache) return cache;
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    cache = JSON.parse(raw) as DuelDbFile;
  } catch {
    cache = { matches: {}, queue: [] };
  }
  return cache;
}

async function saveFileDb(db: DuelDbFile): Promise<void> {
  cache = db;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(db), "utf8");
}

/* ------------------------------------------------------------------ */
/* Matches                                                            */
/* ------------------------------------------------------------------ */

export async function getMatch(id: string): Promise<DuelMatch | null> {
  if (hasSubmissionStore()) {
    try {
      return await kvGetMatch(id);
    } catch (err) {
      console.error("[duel-store] KV getMatch failed, using file:", err);
    }
  }
  const db = await loadFileDb();
  return db.matches[id] ?? null;
}

export async function saveMatch(match: DuelMatch): Promise<void> {
  match.updatedAt = new Date().toISOString();
  if (hasSubmissionStore()) {
    try {
      await kvSaveMatch(match);
      return;
    } catch (err) {
      console.error("[duel-store] KV saveMatch failed, using file:", err);
    }
  }
  const db = await loadFileDb();
  db.matches[match.id] = match;
  const ids = Object.keys(db.matches);
  if (ids.length > MAX_MATCHES) {
    // drop the oldest by updatedAt
    ids
      .sort((a, b) => (db.matches[a].updatedAt < db.matches[b].updatedAt ? -1 : 1))
      .slice(0, ids.length - MAX_MATCHES)
      .forEach((id) => delete db.matches[id]);
  }
  await saveFileDb(db);
}

/* ------------------------------------------------------------------ */
/* Matchmaking queue                                                  */
/* ------------------------------------------------------------------ */

async function loadQueue(): Promise<QueueEntry[]> {
  if (hasSubmissionStore()) {
    try {
      return await kvGetQueue();
    } catch (err) {
      console.error("[duel-store] KV getQueue failed, using file:", err);
    }
  }
  return (await loadFileDb()).queue;
}

async function storeQueue(entries: QueueEntry[]): Promise<void> {
  if (hasSubmissionStore()) {
    try {
      await kvSaveQueue(entries);
      return;
    } catch (err) {
      console.error("[duel-store] KV saveQueue failed, using file:", err);
    }
  }
  const db = await loadFileDb();
  db.queue = entries;
  await saveFileDb(db);
}

export async function enqueue(entry: QueueEntry): Promise<void> {
  const q = (await loadQueue()).filter((e) => e.playerId !== entry.playerId);
  q.push(entry);
  await storeQueue(q);
}

export async function removeFromQueue(predicate: (e: QueueEntry) => boolean): Promise<void> {
  const q = (await loadQueue()).filter((e) => !predicate(e));
  await storeQueue(q);
}

/**
 * Find and remove a waiting opponent matching mode + tempo + rated, within the
 * rating band, not the caller. Stale entries (older than `maxAgeMs`) are pruned.
 * Returns the matched entry, or null if none is waiting.
 */
export async function popOpponent(criteria: {
  mode: DuelMode;
  tempo: DuelTempo;
  rated: boolean;
  rating: number;
  selfId: string;
  band?: number;
  maxAgeMs?: number;
}): Promise<QueueEntry | null> {
  const band = criteria.band ?? 150;
  const maxAge = criteria.maxAgeMs ?? 5 * 60 * 1000;
  const now = Date.now();
  const q = await loadQueue();

  const fresh = q.filter((e) => now - Date.parse(e.enqueuedAt) <= maxAge);
  let matchIdx = -1;
  let best = Infinity;
  for (let i = 0; i < fresh.length; i++) {
    const e = fresh[i];
    if (e.playerId === criteria.selfId) continue;
    if (e.mode !== criteria.mode || e.tempo !== criteria.tempo || e.rated !== criteria.rated) continue;
    const gap = Math.abs(e.rating - criteria.rating);
    if (gap <= band && gap < best) {
      best = gap;
      matchIdx = i;
    }
  }

  const matched = matchIdx >= 0 ? fresh[matchIdx] : null;
  // Persist the pruned queue minus the matched entry.
  const next = fresh.filter((e) => e !== matched);
  if (next.length !== q.length) await storeQueue(next);
  return matched;
}
