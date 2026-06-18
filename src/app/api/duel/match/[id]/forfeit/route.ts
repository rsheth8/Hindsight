import { NextResponse } from "next/server";
import { DuelError, forfeit } from "@/lib/game/duel-service";
import { cleanDeviceId } from "@/lib/game/duel-input";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const viewerId = cleanDeviceId(body.deviceId);
  if (!viewerId) return NextResponse.json({ error: "A device id is required" }, { status: 400 });

  try {
    const match = await forfeit(id, viewerId);
    return NextResponse.json(match, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof DuelError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/duel/match/:id/forfeit]", err);
    return NextResponse.json({ error: "Could not resign." }, { status: 500 });
  }
}
