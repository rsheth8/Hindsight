import { NextResponse } from "next/server";
import { hasRealtime } from "@/lib/env";
import { cleanDeviceId } from "@/lib/game/duel-input";

export const dynamic = "force-dynamic";

/**
 * Realtime capability + channel descriptor for a duel.
 *
 * V1 transport is REST polling (works everywhere with zero infra). When
 * ABLY_API_KEY is set this endpoint is where a scoped Ably token will be minted
 * so clients can subscribe to `match:{id}` for instant updates instead of
 * polling. Until then it reports `enabled:false` and the client polls. See
 * docs/duel-design.md → Infrastructure.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchId = String(searchParams.get("matchId") ?? "").trim().slice(0, 64);
  const viewerId = cleanDeviceId(searchParams.get("deviceId"));
  if (!matchId || !viewerId) {
    return NextResponse.json({ error: "matchId and deviceId are required" }, { status: 400 });
  }

  return NextResponse.json(
    {
      enabled: hasRealtime(),
      transport: hasRealtime() ? "ably" : "polling",
      channel: `match:${matchId}`,
      // token: <minted here once the Ably SDK is wired>
    },
    { headers: { "cache-control": "no-store" } },
  );
}
