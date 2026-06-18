import { describe, expect, it, vi } from "vitest";
import { gradeReasoning, explainReveal } from "./grade";
import { mockSolvedProblem } from "@/test/fixtures/problem";

vi.mock("./client", () => ({
  hasAnthropicKey: () => false,
  aiMessage: vi.fn(),
}));

const problem = mockSolvedProblem();

describe("grade (heuristic path)", () => {
  it("scores empty reasoning very low", async () => {
    const g = await gradeReasoning({ reasoning: "hi", problem, choice: "A", confidence: 0.7 });
    expect(g.score).toBeLessThanOrEqual(0.15);
  });

  it("rewards evidence + counter-thesis keywords", async () => {
    const rich =
      "The trend momentum is above the 50-day average with moderate volatility. However, downside risk remains if support breaks. I would change my mind if momentum reverses.";
    const g = await gradeReasoning({ reasoning: rich, problem, choice: "B", confidence: 0.65 });
    expect(g.score).toBeGreaterThanOrEqual(0.75);
    expect(g.notes.length).toBeGreaterThan(10);
  });

  it("explainReveal returns educational copy without buy/sell advice", async () => {
    const text = await explainReveal({ problem, correct: true, choice: "A", depth: "learn" });
    expect(text).toContain(problem.reveal.company);
    expect(text.toLowerCase()).not.toMatch(/\bbuy\b|\bsell\b/);
  });
});
