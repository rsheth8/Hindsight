import { NextResponse } from "next/server";
import { hasRealtime } from "@/lib/env";
import { cleanDeviceId } from "@/lib/game/duel-input";
import { createMatchTokenRequest, duelChannelName } from "@/lib/duel/realtime";

export const dynamic = "force-dynamic";

/**
 * Realtime capability + Ably token for a duel.
 *
 * When ABLY_API_KEY is set, returns a scoped subscribe token for `match:{id}`.
 * Clients subscribe to the `updated` event and re-fetch match state from the
 * REST API (authoritative). Without Ably, reports `enabled:false` and the
 * client falls back to REST polling.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchId = String(searchParams.get("matchId") ?? "").trim().slice(0, 64);
  const viewerId = cleanDeviceId(searchParams.get("deviceId"));
  if (!matchId || !viewerId) {
    return NextResponse.json({ error: "matchId and deviceId are required" }, { status: 400 });
  }

  const channel = duelChannelName(matchId);

  if (!hasRealtime()) {
    return NextResponse.json(
      { enabled: false, transport: "polling" as const, channel },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const tokenRequest = await createMatchTokenRequest(matchId, viewerId);
  if (!tokenRequest) {
    return NextResponse.json(
      { enabled: false, transport: "polling" as const, channel },
      { headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      enabled: true,
      transport: "ably" as const,
      channel,
      tokenRequest,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
