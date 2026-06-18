import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import type { StoredSubmission } from "@/lib/db/submissions-types";
import { hasSubmissionStore } from "@/lib/env";
import { kvGetSubmissionsForProblem } from "@/lib/db/submissions-kv";

export const dynamic = "force-dynamic";

const DATA_FILE = path.join(process.cwd(), ".data", "submissions.json");

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function calibScore(brier: number): number {
  return Math.round(Math.max(0, Math.min(100, ((0.25 - brier) / 0.25) * 100)));
}

async function allSubmissions(): Promise<StoredSubmission[]> {
  if (hasSubmissionStore()) {
    try {
      // KV doesn't have list-all; file fallback for leaderboard v1
    } catch { /* fall through */ }
  }
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return (JSON.parse(raw) as { submissions: StoredSubmission[] }).submissions ?? [];
  } catch {
    return [];
  }
}

/** Weekly calibration leaderboard from anonymous daily submissions. */
export async function GET() {
  const subs = await allSubmissions();
  const thisWeek = isoWeekKey(new Date().toISOString().slice(0, 10));

  const byDevice = new Map<string, { brierSum: number; n: number }>();
  for (const s of subs) {
    if (!s.problemDate || isoWeekKey(s.problemDate) !== thisWeek) continue;
    const row = byDevice.get(s.deviceId) ?? { brierSum: 0, n: 0 };
    row.brierSum += s.brier;
    row.n += 1;
    byDevice.set(s.deviceId, row);
  }

  const board = [...byDevice.entries()]
    .filter(([, v]) => v.n >= 2)
    .map(([deviceId, v]) => ({
      id: deviceId.slice(0, 6),
      calibration: calibScore(v.brierSum / v.n),
      calls: v.n,
    }))
    .sort((a, b) => b.calibration - a.calibration)
    .slice(0, 25);

  return NextResponse.json({
    week: thisWeek,
    entries: board,
    real: board.length > 0,
  });
}
