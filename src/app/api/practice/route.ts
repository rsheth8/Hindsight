import { NextResponse } from "next/server";
import { getPracticeProblem, type PracticeFocus } from "@/lib/game/practice";
import type { DailyProblem, SolvedProblem } from "@/lib/game/types";

export const dynamic = "force-dynamic";

const FOCUSES: PracticeFocus[] = ["hard", "high-vol", "boundary", "reversal", "mixed"];

function toClient(p: SolvedProblem): DailyProblem {
  const { answer: _a, reveal: _r, ...rest } = p;
  void _a;
  void _r;
  return rest;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed")?.trim();
  const focusRaw = searchParams.get("focus")?.trim() as PracticeFocus | undefined;

  if (!seed || seed.length < 4) {
    return NextResponse.json({ error: "seed required" }, { status: 400 });
  }
  const focus = focusRaw && FOCUSES.includes(focusRaw) ? focusRaw : "mixed";

  try {
    const problem = await getPracticeProblem(seed, focus);
    return NextResponse.json(toClient(problem), { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[api/practice]", err);
    return NextResponse.json({ error: "Could not load a practice problem." }, { status: 500 });
  }
}
