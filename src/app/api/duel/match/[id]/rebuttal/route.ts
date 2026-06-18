import { NextResponse } from "next/server";
import { cleanDeviceId } from "@/lib/game/duel-input";
import { DuelError, submitRebuttal } from "@/lib/game/duel-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const deviceId = cleanDeviceId(body.deviceId);
  const text = String(body.text ?? "");
  if (!deviceId) return NextResponse.json({ error: "deviceId is required" }, { status: 400 });

  try {
    const match = await submitRebuttal(id, deviceId, text);
    return NextResponse.json(match);
  } catch (e) {
    if (e instanceof DuelError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[duel/rebuttal]", e);
    return NextResponse.json({ error: "Could not submit rebuttal" }, { status: 500 });
  }
}
