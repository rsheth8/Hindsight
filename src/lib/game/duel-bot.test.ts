import { describe, expect, it } from "vitest";
import { mockSolvedProblem } from "@/test/fixtures/problem";
import { botCall, isBotId, makeBot } from "./duel-bot";

describe("duel bot", () => {
  it("flags bot ids", () => {
    const bot = makeBot(1000, "match-1:bot");
    expect(isBotId(bot.id)).toBe(true);
    expect(isBotId("dev-human")).toBe(false);
    expect(bot.isBot).toBe(true);
    expect(bot.name).toMatch(/^\S+ \S+$/);
  });

  it("seeds the bot near the player's rating", () => {
    const bot = makeBot(1400, "m:bot");
    expect(Math.abs(bot.duelRating - 1400)).toBeLessThanOrEqual(60);
  });

  it("is deterministic for the same (problem, rating, seed)", () => {
    const problem = mockSolvedProblem({ answer: "A" });
    const a = botCall(problem, 1200, "seed-x");
    const b = botCall(problem, 1200, "seed-x");
    expect(a).toEqual(b);
  });

  it("produces a valid, non-empty call", () => {
    const problem = mockSolvedProblem({ answer: "A" });
    const call = botCall(problem, 1000, "seed-y");
    expect(["A", "B", "C"]).toContain(call.choice);
    expect(call.confidence).toBeGreaterThanOrEqual(0.4);
    expect(call.confidence).toBeLessThanOrEqual(0.92);
    expect(call.reasoning.length).toBeGreaterThan(0);
  });

  it("stronger bots pick the answer more often across boards", () => {
    let weak = 0;
    let strong = 0;
    for (let i = 0; i < 200; i++) {
      const problem = mockSolvedProblem({ answer: "A" });
      if (botCall(problem, 500, `s-${i}`).choice === "A") weak++;
      if (botCall(problem, 1800, `s-${i}`).choice === "A") strong++;
    }
    expect(strong).toBeGreaterThan(weak);
  });
});
