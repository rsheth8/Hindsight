import { NextResponse } from "next/server";
import { getDailyProblem } from "@/lib/game/daily";
import { getPracticeProblem, type PracticeFocus } from "@/lib/game/practice";
import { resolveBlindProblem } from "@/lib/game/blind-replay";
import { brierFor } from "@/lib/game/calibration";
import { updateRating } from "@/lib/game/rating";
import { gradeReasoning, explainReveal, type Depth } from "@/lib/ai/grade";
import { crowdForProblem, saveSubmission } from "@/lib/db/submissions";
import type { ChoiceId, GradeResult, SolvedProblem } from "@/lib/game/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Body {
  choice: ChoiceId;
  confidence: number;
  reasoning: string;
  rating: number;
  gradedCount: number;
  depth?: Depth;
  deviceId?: string;
  practice?: { seed: string; focus: PracticeFocus };
  blindReplay?: { seed: string; focus: PracticeFocus; visibleDays: number };
}

async function loadProblem(body: Body): Promise<SolvedProblem> {
  if (body.blindReplay) {
    return resolveBlindProblem(body.blindReplay.seed, body.blindReplay.focus, body.blindReplay.visibleDays);
  }
  if (body.practice) {
    return getPracticeProblem(body.practice.seed, body.practice.focus);
  }
  return getDailyProblem();
}

function problemIdFor(body: Body, problem: SolvedProblem): string {
  if (body.blindReplay) return `blind-${body.blindReplay.seed}`;
  return problem.id;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const choice = body.choice;
  if (!["A", "B", "C"].includes(choice)) {
    return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
  }
  const confidence = Math.max(0.5, Math.min(1, Number(body.confidence) || 0.5));
  const reasoning = String(body.reasoning ?? "");
  const rating = Number.isFinite(body.rating) ? body.rating : 1000;
  const gradedCount = Number.isFinite(body.gradedCount) ? body.gradedCount : 0;
  const depth: Depth = body.depth ?? "learn";
  const deviceId = String(body.deviceId ?? "anonymous").slice(0, 64);

  try {
    const problem = await loadProblem(body);
    const pid = problemIdFor(body, problem);
    const correct = choice === problem.answer;
    const brier = brierFor(confidence, correct);

    const [reasoningGrade, explanation] = await Promise.all([
      gradeReasoning({ reasoning, problem, choice, confidence }),
      explainReveal({ problem, correct, choice, depth }),
    ]);

    const update = updateRating({
      rating,
      gradedCount,
      difficulty: problem.difficulty,
      inputs: { correct, brier, reasoning: reasoningGrade.score },
    });

    if (deviceId && deviceId !== "anonymous" && !body.practice && !body.blindReplay) {
      await saveSubmission({
        deviceId,
        problemId: pid,
        problemDate: problem.date,
        choice,
        confidence,
        correct,
        brier,
        reasoningScore: reasoningGrade.score,
        ratingDelta: update.delta,
      });
    }

    const { crowd, crowdReal, sampleSize } = await crowdForProblem(pid, problem.crowd);

    const result: GradeResult = {
      correct,
      answer: problem.answer,
      brier: +brier.toFixed(4),
      reasoning: +reasoningGrade.score.toFixed(2),
      reasoningNotes: reasoningGrade.notes,
      score: +update.score.toFixed(3),
      ratingDelta: update.delta,
      newRating: update.newRating,
      earned: update.earned,
      explanation,
      reveal: problem.reveal,
      crowd,
      crowdReal,
      crowdSampleSize: sampleSize,
    };
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[api/grade]", err);
    return NextResponse.json({ error: "Grading failed." }, { status: 500 });
  }
}
