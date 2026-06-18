/**
 * Ably transport for duels — server-side only. Publishes lightweight "updated"
 * pings on `match:{id}` so clients re-fetch authoritative state from the API.
 * KV/file store remains the source of truth; Ably is never trusted for grades.
 */
import Ably from "ably";
import { hasRealtime } from "@/lib/env";

export const DUEL_CHANNEL_PREFIX = "match:";
export const DUEL_UPDATE_EVENT = "updated";

let rest: Ably.Rest | null = null;

function getRest(): Ably.Rest | null {
  if (!hasRealtime()) return null;
  const key = process.env.ABLY_API_KEY?.trim();
  if (!key) return null;
  if (!rest) rest = new Ably.Rest({ key });
  return rest;
}

export function duelChannelName(matchId: string): string {
  return `${DUEL_CHANNEL_PREFIX}${matchId}`;
}

/** Mint a subscribe-only token scoped to one match channel. */
export async function createMatchTokenRequest(
  matchId: string,
  clientId: string,
): Promise<Ably.TokenRequest | null> {
  const client = getRest();
  if (!client) return null;
  const channel = duelChannelName(matchId);
  return client.auth.createTokenRequest({
    clientId,
    capability: { [channel]: ["subscribe", "presence"] },
    ttl: 60 * 60 * 1000, // 1h — refreshed by the client's authCallback
  });
}

/** Tell subscribers to pull fresh match state. Fire-and-forget. */
export async function publishMatchUpdated(matchId: string): Promise<void> {
  const client = getRest();
  if (!client) return;
  try {
    const channel = client.channels.get(duelChannelName(matchId));
    await channel.publish(DUEL_UPDATE_EVENT, { at: Date.now() });
  } catch (err) {
    console.error("[duel-realtime] publish failed:", err);
  }
}
