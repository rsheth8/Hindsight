/**
 * Request validation helpers for the duel API. Keeps route handlers thin and the
 * accepted shapes in one place.
 */
import {
  CLOCK_SECONDS,
  DUEL_MODES,
  seedDuelRating,
  START_DUEL_RATING,
  type DuelClock,
  type DuelMode,
  type DuelTempo,
  type PlayerSlot,
} from "./duel";

const TEMPOS: DuelTempo[] = ["live", "async", "hybrid"];

export function parseMode(v: unknown): DuelMode | null {
  return typeof v === "string" && v in DUEL_MODES ? (v as DuelMode) : null;
}

export function parseTempo(v: unknown): DuelTempo | null {
  return typeof v === "string" && (TEMPOS as string[]).includes(v) ? (v as DuelTempo) : null;
}

export function parseClock(v: unknown): DuelClock | null {
  return typeof v === "string" && v in CLOCK_SECONDS ? (v as DuelClock) : null;
}

export function cleanDeviceId(v: unknown): string {
  const id = String(v ?? "").trim().slice(0, 64);
  return id;
}

export function cleanName(v: unknown, fallback: string): string {
  const n = String(v ?? "").trim().slice(0, 24);
  return n || fallback;
}

/** Build a PlayerSlot from a request body, seeding a duel rating when absent. */
export function makePlayer(body: {
  deviceId?: unknown;
  name?: unknown;
  duelRating?: unknown;
  duelMatchesPlayed?: unknown;
  judgmentRating?: unknown;
}): PlayerSlot | null {
  const id = cleanDeviceId(body.deviceId);
  if (!id || id === "anonymous" || id === "server") return null;

  const rawRating = Number(body.duelRating);
  const duelRating = Number.isFinite(rawRating)
    ? Math.max(100, Math.round(rawRating))
    : seedDuelRating(Number(body.judgmentRating) || START_DUEL_RATING);

  const rawMatches = Number(body.duelMatchesPlayed);
  const duelMatchesPlayed = Number.isFinite(rawMatches) && rawMatches >= 0 ? Math.floor(rawMatches) : 0;

  return {
    id,
    name: cleanName(body.name, "Player"),
    duelRating,
    duelMatchesPlayed,
  };
}
