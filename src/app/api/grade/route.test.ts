import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { jsonRequest, readJson } from "@/test/helpers/http";
import { mockSolvedProblem } from "@/test/fixtures/problem";

vi.mock("@/lib/game/daily", () => ({ getDailyProblem: vi.fn() }));
vi.mock("@/lib/game/practice", () => ({ getPracticeProblem: vi.fn() }));
vi.mock("@/lib/game/blind-replay", () => ({ resolveBlindProblem: vi.fn() }));
vi.mock("@/lib/ai/grade", () => ({
  gradeReasoning: vi.fn(async () => ({ score: 0.72, notes: "Solid evidence." })),
  explainReveal: vi.fn(async () => "Coach explanation here."),
}));
vi.mock("@/lib/db/submissions", () => ({
  saveSubmission: vi.fn(async () => ({})),
  crowdForProblem: vi.fn(async (_id: string, synthetic: Record<string, number>) => ({
    crowd: synthetic,
    crowdReal: false,
    sampleSize: 0,
  })),
}));

import { getDailyProblem } from "@/lib/game/daily";
import { getPracticeProblem } from "@/lib/game/practice";
import { saveSubmission } from "@/lib/db/submissions";

describe("POST /api/grade", () => {
  beforeEach(() => {
    vi.mocked(getDailyProblem).mockResolvedValue(
      mockSolvedProblem({ id: "bank-daily", answer: "A", crowd: { A: 40, B: 35, C: 25 } }),
    );
    vi.mocked(getPracticeProblem).mockResolvedValue(
      mockSolvedProblem({ id: "practice-test", answer: "B", crowd: { A: 30, B: 45, C: 25 } }),
    );
  });

  const validBody = {
    choice: "A",
    confidence: 0.75,
    reasoning: "Uptrend momentum above the 50-day average however risk remains",
    rating: 1000,
    gradedCount: 5,
    deviceId: "test-device-123",
  };

  it("rejects invalid choice", async () => {
    const res = await POST(jsonRequest("http://localhost/api/grade", {
      method: "POST",
      body: { ...validBody, choice: "D" },
    }));
    expect(res.status).toBe(400);
  });

  it("rejects empty reasoning", async () => {
    const res = await POST(jsonRequest("http://localhost/api/grade", {
      method: "POST",
      body: { ...validBody, reasoning: "   " },
    }));
    const body = await readJson<{ error: string }>(res);
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/reasoning/i);
  });

  it("clamps confidence to [1/3, 1]", async () => {
    // 0.1 is below the pure-guess floor → treated as 1/3
    const lo = await POST(jsonRequest("http://localhost/api/grade", {
      method: "POST",
      body: { ...validBody, confidence: 0.1 },
    }));
    expect(lo.status).toBe(200);
    const loBody = await readJson<{ brier: number; correct: boolean }>(lo);
    const expectedLo = loBody.correct ? (1 - 1 / 3) ** 2 : (1 / 3) ** 2;
    expect(loBody.brier).toBeCloseTo(expectedLo, 3);

    // 1.5 is above the ceiling → treated as 1.0
    const hi = await POST(jsonRequest("http://localhost/api/grade", {
      method: "POST",
      body: { ...validBody, confidence: 1.5 },
    }));
    expect(hi.status).toBe(200);
    const hiBody = await readJson<{ brier: number; correct: boolean }>(hi);
    expect(hiBody.brier).toBeCloseTo(hiBody.correct ? 0 : 1, 3);
  });

  it("saves submission for daily with deviceId", async () => {
    const res = await POST(jsonRequest("http://localhost/api/grade", {
      method: "POST",
      body: validBody,
    }));
    expect(res.status).toBe(200);
    expect(saveSubmission).toHaveBeenCalledOnce();
  });

  it("does not save submission for practice mode", async () => {
    vi.mocked(saveSubmission).mockClear();
    const res = await POST(jsonRequest("http://localhost/api/grade", {
      method: "POST",
      body: {
        ...validBody,
        practice: { seed: "p-test-1234", focus: "mixed" },
      },
    }));
    expect(res.status).toBe(200);
    expect(saveSubmission).not.toHaveBeenCalled();
  });

  it("returns grade result shape", async () => {
    const res = await POST(jsonRequest("http://localhost/api/grade", {
      method: "POST",
      body: validBody,
    }));
    const body = await readJson<Record<string, unknown>>(res);
    expect(body).toMatchObject({
      correct: true,
      answer: "A",
      newRating: expect.any(Number),
      ratingDelta: expect.any(Number),
      explanation: expect.any(String),
    });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
