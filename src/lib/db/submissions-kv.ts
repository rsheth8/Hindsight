/**
 * Production submission store — Vercel KV / Upstash Redis (same REST env vars).
 * Set KV_REST_API_URL + KV_REST_API_TOKEN on the host.
 */
import { kv } from "@vercel/kv";
import type { StoredSubmission } from "./submissions-types";

const KEY = "hindsight:submissions:v1";
const MAX = 50000;

async function loadAll(): Promise<StoredSubmission[]> {
  const rows = await kv.get<StoredSubmission[]>(KEY);
  return rows ?? [];
}

async function saveAll(rows: StoredSubmission[]): Promise<void> {
  await kv.set(KEY, rows.length > MAX ? rows.slice(-MAX) : rows);
}

export async function kvSaveSubmission(
  entry: Omit<StoredSubmission, "id" | "createdAt">,
): Promise<StoredSubmission> {
  const db = await loadAll();
  const row: StoredSubmission = {
    ...entry,
    id: `${entry.deviceId}-${entry.problemId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const next = db.filter((s) => !(s.deviceId === entry.deviceId && s.problemId === entry.problemId));
  next.push(row);
  await saveAll(next);
  return row;
}

export async function kvGetSubmissionsForProblem(problemId: string): Promise<StoredSubmission[]> {
  const db = await loadAll();
  return db.filter((s) => s.problemId === problemId);
}
