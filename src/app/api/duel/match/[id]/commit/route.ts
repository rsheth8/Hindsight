import { NextResponse } from "next/server";
import { commit, DuelError } from "@/lib/game/duel-service";
import { cleanDeviceId } from "@/lib/game/duel-input";
import { GUESS_CONFIDENCE } from "@/lib/game/calibration";
import type { ChoiceId } from "@/lib/game/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Body {
  deviceId?: unknown;
  choice?: unknown;
  confidence?: unknown;
  reasoning?: unknown;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const viewerId = cleanDeviceId(body.deviceId);
  if (!viewerId) return NextResponse.json({ error: "A device id is required" }, { status: 400 });

  const choice = body.choice;
  if (choice !== "A" && choice !== "B" && choice !== "C") {
    return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
  }
  const rawConfidence = Number(body.confidence);
  const confidence = Math.max(
    GUESS_CONFIDENCE,
    Math.min(1, Number.isFinite(rawConfidence) ? rawConfidence : GUESS_CONFIDENCE),
  );
  const reasoning = String(body.reasoning ?? "").trim();
  if (!reasoning) {
    return NextResponse.json({ error: "Add at least one reasoning chip or note." }, { status: 400 });
  }

  try {
    const match = await commit(id, viewerId, { choice: choice as ChoiceId, confidence, reasoning });
    return NextResponse.json(match, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof DuelError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/duel/match/:id/commit]", err);
    return NextResponse.json({ error: "Could not lock in your call." }, { status: 500 });
  }
}
