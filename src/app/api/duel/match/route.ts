import { NextResponse } from "next/server";
import { createMatch, DuelError } from "@/lib/game/duel-service";
import { makePlayer, parseClock, parseMode, parseTempo } from "@/lib/game/duel-input";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Body {
  mode?: unknown;
  tempo?: unknown;
  clock?: unknown;
  rated?: unknown;
  kind?: unknown;
  deviceId?: unknown;
  name?: unknown;
  duelRating?: unknown;
  duelMatchesPlayed?: unknown;
  judgmentRating?: unknown;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const mode = parseMode(body.mode);
  const tempo = parseTempo(body.tempo);
  if (!mode) return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  if (!tempo) return NextResponse.json({ error: "Unknown tempo" }, { status: 400 });

  const clock = tempo === "async" ? null : parseClock(body.clock) ?? "rapid";
  const rated = body.rated !== false; // default rated
  const kind = body.kind === "friend" ? "friend" : "queue";

  const player = makePlayer(body);
  if (!player) return NextResponse.json({ error: "A device id is required" }, { status: 400 });

  try {
    const result = await createMatch({ mode, tempo, clock, rated, player, kind });
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof DuelError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/duel/match]", err);
    return NextResponse.json({ error: "Could not create the match." }, { status: 500 });
  }
}
