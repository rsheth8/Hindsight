/**
 * Server-side submission store — anonymous device IDs + per-problem crowd splits.
 * Persists to `.data/submissions.json` locally; swap for Postgres/KV in production.
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
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

interface DbFile {
  submissions: StoredSubmission[];
}

const MIN_REAL_CROWD = 3;
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "submissions.json");

let cache: DbFile | null = null;

async function loadDb(): Promise<DbFile> {
  if (cache) return cache;
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    cache = JSON.parse(raw) as DbFile;
    return cache;
  } catch {
    cache = { submissions: [] };
    return cache;
  }
}

async function saveDb(db: DbFile): Promise<void> {
  cache = db;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

export async function saveSubmission(entry: Omit<StoredSubmission, "id" | "createdAt">): Promise<StoredSubmission> {
  const db = await loadDb();
  const row: StoredSubmission = {
    ...entry,
    id: `${entry.deviceId}-${entry.problemId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  // one submission per device per problem
  db.submissions = db.submissions.filter(
    (s) => !(s.deviceId === entry.deviceId && s.problemId === entry.problemId),
  );
  db.submissions.push(row);
  if (db.submissions.length > 50000) db.submissions = db.submissions.slice(-50000);
  await saveDb(db);
  return row;
}

export async function getSubmissionsForProblem(problemId: string): Promise<StoredSubmission[]> {
  const db = await loadDb();
  return db.submissions.filter((s) => s.problemId === problemId);
}

function computeCrowd(submissions: StoredSubmission[]): Record<ChoiceId, number> {
  const counts: Record<ChoiceId, number> = { A: 0, B: 0, C: 0 };
  for (const s of submissions) counts[s.choice] += 1;
  const total = submissions.length || 1;
  return {
    A: Math.round((counts.A / total) * 100),
    B: Math.round((counts.B / total) * 100),
    C: Math.round((counts.C / total) * 100),
  };
}

/** Real crowd when enough submissions exist; otherwise fall back to synthetic. */
export async function crowdForProblem(
  problemId: string,
  synthetic: Record<ChoiceId, number>,
): Promise<{ crowd: Record<ChoiceId, number>; crowdReal: boolean; sampleSize: number }> {
  const subs = await getSubmissionsForProblem(problemId);
  if (subs.length >= MIN_REAL_CROWD) {
    return { crowd: computeCrowd(subs), crowdReal: true, sampleSize: subs.length };
  }
  return { crowd: synthetic, crowdReal: false, sampleSize: subs.length };
}
