import { NextResponse } from "next/server";
import { getDailyProblem } from "@/lib/game/daily";
import { crowdForProblem } from "@/lib/db/submissions";
import type { DailyProblem, SolvedProblem } from "@/lib/game/types";

export const dynamic = "force-dynamic";

/** Strip the answer + reveal before sending to the client. */
async function toClient(p: SolvedProblem): Promise<DailyProblem> {
  const { answer: _a, reveal: _r, ...rest } = p;
  void _a;
  void _r;
  const { crowd, crowdReal, sampleSize } = await crowdForProblem(p.id, p.crowd);
  return { ...rest, crowd, crowdReal, crowdSampleSize: sampleSize };
}

export async function GET() {
  try {
    const problem = await getDailyProblem();
    return NextResponse.json(await toClient(problem), {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    console.error("[api/daily]", err);
    return NextResponse.json({ error: "Could not load today's problem." }, { status: 500 });
  }
}
