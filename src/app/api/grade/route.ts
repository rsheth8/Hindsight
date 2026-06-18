import { NextResponse } from "next/server";
import { getDailyProblem } from "@/lib/game/daily";
import { getPracticeProblem, type PracticeFocus } from "@/lib/game/practice";
import { resolveBlindProblem } from "@/lib/game/blind-replay";
import { getSpecialProblem, isSpecialType, specialProblemId } from "@/lib/game/special-problems";
import type { ProblemType } from "@/lib/game/types";
import { brierFor, GUESS_CONFIDENCE } from "@/lib/game/calibration";
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
  special?: { type: ProblemType; seed: string };
}

async function loadProblem(body: Body): Promise<SolvedProblem> {
  if (body.blindReplay) {
    return resolveBlindProblem(body.blindReplay.seed, body.blindReplay.focus, body.blindReplay.visibleDays);
  }
  if (body.special && isSpecialType(body.special.type)) {
    return getSpecialProblem(body.special.type, body.special.seed);
  }
  if (body.practice) {
    return getPracticeProblem(body.practice.seed, body.practice.focus);
  }
  return getDailyProblem();
}

function problemIdFor(body: Body, problem: SolvedProblem): string {
  if (body.blindReplay) return `blind-${body.blindReplay.seed}`;
  if (body.special && isSpecialType(body.special.type)) {
    return specialProblemId(body.special.type, body.special.seed);
  }
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
  const rawConfidence = Number(body.confidence);
  const confidence = Math.max(
    GUESS_CONFIDENCE,
    Math.min(1, Number.isFinite(rawConfidence) ? rawConfidence : GUESS_CONFIDENCE),
  );
  const reasoning = String(body.reasoning ?? "").trim();
  if (!reasoning) {
    return NextResponse.json({ error: "Add at least one reasoning chip or note." }, { status: 400 });
  }
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

    if (deviceId && deviceId !== "anonymous" && !body.practice && !body.blindReplay && !body.special) {
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
