import { NextResponse } from "next/server";
import { currentProblem, DuelError } from "@/lib/game/duel-service";
import { cleanDeviceId } from "@/lib/game/duel-input";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const viewerId = cleanDeviceId(searchParams.get("deviceId"));
  if (!viewerId) return NextResponse.json({ error: "A device id is required" }, { status: 400 });

  try {
    const data = await currentProblem(id, viewerId);
    return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof DuelError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/duel/match/:id/problem]", err);
    return NextResponse.json({ error: "Could not load the round." }, { status: 500 });
  }
}
