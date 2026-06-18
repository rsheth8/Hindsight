import { describe, expect, it } from "vitest";
import { problemTags, getPracticeProblem } from "./practice";
import { mockSolvedProblem } from "@/test/fixtures/problem";

describe("practice", () => {
  it("tags hard setups by difficulty", () => {
    const p = mockSolvedProblem({ difficulty: 0.75 });
    expect(problemTags(p)).toContain("hard");
  });

  it("getPracticeProblem is deterministic for seed+focus", async () => {
    const a = await getPracticeProblem("test-seed-abc", "mixed");
    const b = await getPracticeProblem("test-seed-abc", "mixed");
    expect(a.id).toBe(b.id);
    expect(a.id.startsWith("practice-")).toBe(true);
  });

  it("practice problems have server-side answer for grading", async () => {
    const p = await getPracticeProblem("test-seed-xyz", "hard");
    expect(["A", "B", "C"]).toContain(p.answer);
    expect(p.reveal.forwardReturnPct).toBeDefined();
  });
});
