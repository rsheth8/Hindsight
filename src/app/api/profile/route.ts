import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { Profile } from "@/lib/profile/store";
import { emptyProfile } from "@/lib/profile/store";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), ".data");
const PROFILE_FILE = path.join(DATA_DIR, "profiles.json");

interface Db {
  profiles: Record<string, Profile>;
}

async function loadDb(): Promise<Db> {
  try {
    const raw = await readFile(PROFILE_FILE, "utf8");
    return JSON.parse(raw) as Db;
  } catch {
    return { profiles: {} };
  }
}

async function saveDb(db: Db): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(PROFILE_FILE, JSON.stringify(db, null, 2), "utf8");
}

/** Anonymous profile sync by deviceId — foundation before full accounts. */
export async function GET(req: Request) {
  const deviceId = new URL(req.url).searchParams.get("deviceId")?.trim().slice(0, 64);
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  const db = await loadDb();
  const profile = db.profiles[deviceId];
  if (!profile) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile });
}

export async function PUT(req: Request) {
  let body: { deviceId?: string; profile?: Profile };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const deviceId = String(body.deviceId ?? "").trim().slice(0, 64);
  if (!deviceId || !body.profile) {
    return NextResponse.json({ error: "deviceId and profile required" }, { status: 400 });
  }
  const db = await loadDb();
  db.profiles[deviceId] = { ...emptyProfile(), ...body.profile };
  await saveDb(db);
  return NextResponse.json({ ok: true });
}
