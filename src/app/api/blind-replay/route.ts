import { NextResponse } from "next/server";
import { getBlindReplayProblem, BLIND_MAX_DAYS, BLIND_STEP_DAYS } from "@/lib/game/blind-replay";
import type { PracticeFocus } from "@/lib/game/practice";

export const dynamic = "force-dynamic";

const FOCUSES: PracticeFocus[] = ["hard", "high-vol", "boundary", "reversal", "mixed"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed")?.trim();
  const focusRaw = searchParams.get("focus")?.trim() as PracticeFocus | undefined;
  const visible = Number(searchParams.get("visible") ?? 0);

  if (!seed || seed.length < 4) {
    return NextResponse.json({ error: "seed required" }, { status: 400 });
  }
  const focus = focusRaw && FOCUSES.includes(focusRaw) ? focusRaw : "mixed";

  try {
    const { client, visibleDays, maxDays } = await getBlindReplayProblem(seed, focus, visible || undefined);
    return NextResponse.json(
      { problem: client, visibleDays, maxDays, stepDays: BLIND_STEP_DAYS, canAdvance: visibleDays < maxDays && visibleDays < BLIND_MAX_DAYS },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/blind-replay]", err);
    return NextResponse.json({ error: "Could not load blind replay." }, { status: 500 });
  }
}
