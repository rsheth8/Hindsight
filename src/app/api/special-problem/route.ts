import { NextResponse } from "next/server";
import { getSpecialProblem, isSpecialType } from "@/lib/game/special-problems";
import type { DailyProblem, ProblemType, SolvedProblem } from "@/lib/game/types";

export const dynamic = "force-dynamic";

function toClient(p: SolvedProblem): DailyProblem {
  const { answer: _a, reveal: _r, ...rest } = p;
  void _a;
  void _r;
  return rest;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed")?.trim();
  const typeRaw = searchParams.get("type")?.trim() as ProblemType | undefined;

  if (!seed || seed.length < 4) {
    return NextResponse.json({ error: "seed required" }, { status: 400 });
  }
  if (!typeRaw || !isSpecialType(typeRaw)) {
    return NextResponse.json({ error: "type must be spot-the-flaw, options-greeks, futures-basics, or calibration-bet" }, { status: 400 });
  }

  try {
    const problem = await getSpecialProblem(typeRaw, seed);
    return NextResponse.json(toClient(problem), { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[api/special-problem]", err);
    return NextResponse.json({ error: "Could not load problem." }, { status: 500 });
  }
}
