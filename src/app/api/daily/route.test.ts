import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { readJson } from "@/test/helpers/http";
import { mockSolvedProblem } from "@/test/fixtures/problem";

vi.mock("@/lib/game/daily", () => ({
  getDailyProblem: vi.fn(),
}));

vi.mock("@/lib/db/submissions", () => ({
  crowdForProblem: vi.fn(async (_id: string, synthetic: Record<string, number>) => ({
    crowd: synthetic,
    crowdReal: false,
    sampleSize: 0,
  })),
}));

import { getDailyProblem } from "@/lib/game/daily";

describe("GET /api/daily", () => {
  beforeEach(() => {
    vi.mocked(getDailyProblem).mockResolvedValue(mockSolvedProblem({ id: "bank-2026-06-17-TEST" }));
  });

  it("strips answer and reveal from response", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await readJson<Record<string, unknown>>(res);
    expect(body).not.toHaveProperty("answer");
    expect(body).not.toHaveProperty("reveal");
    expect(body.id).toBe("bank-2026-06-17-TEST");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
