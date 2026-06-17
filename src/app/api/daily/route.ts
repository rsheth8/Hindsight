import { NextResponse } from "next/server";
import { getDailyProblem } from "@/lib/game/daily";
import type { DailyProblem, SolvedProblem } from "@/lib/game/types";

export const dynamic = "force-dynamic";

/** Strip the answer + reveal before sending to the client. */
function toClient(p: SolvedProblem): DailyProblem {
  const { answer: _a, reveal: _r, ...rest } = p;
  void _a;
  void _r;
  return rest;
}

export async function GET() {
  try {
    const problem = await getDailyProblem();
    return NextResponse.json(toClient(problem), {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    console.error("[api/daily]", err);
    return NextResponse.json({ error: "Could not load today's problem." }, { status: 500 });
  }
}
