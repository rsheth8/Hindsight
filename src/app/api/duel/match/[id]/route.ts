import { NextResponse } from "next/server";
import { DuelError, viewMatch } from "@/lib/game/duel-service";
import { cleanDeviceId } from "@/lib/game/duel-input";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const viewerId = cleanDeviceId(searchParams.get("deviceId"));
  if (!viewerId) return NextResponse.json({ error: "A device id is required" }, { status: 400 });

  try {
    const match = await viewMatch(id, viewerId);
    return NextResponse.json(match, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof DuelError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/duel/match/:id]", err);
    return NextResponse.json({ error: "Could not load the match." }, { status: 500 });
  }
}
