import { describe, expect, it } from "vitest";
import {
  compareGrades,
  duelExpectedScore,
  duelName,
  explainRound,
  forfeitGrade,
  isExpired,
  isMatchOver,
  matchWinnerId,
  resultFor,
  roundWinnerId,
  seedDuelRating,
  tallyWins,
  updateDuelRating,
  type DuelMatch,
  type DuelRound,
  type PlayerSlot,
  type RoundGrade,
} from "./duel";

function grade(over: Partial<RoundGrade> = {}): RoundGrade {
  return {
    choice: "A",
    confidence: 0.7,
    correct: true,
    brier: 0.09,
    reasoning: 0.6,
    reasoningNotes: "",
    score: 0.7,
    ...over,
  };
}

function player(id: string, over: Partial<PlayerSlot> = {}): PlayerSlot {
  return { id, name: id, duelRating: 1000, duelMatchesPlayed: 0, ...over };
}

function round(over: Partial<DuelRound> = {}): DuelRound {
  return {
    index: 0,
    problemId: "duel-m1-r0",
    seed: "duel-m1-r0",
    state: "active",
    commits: {},
    ...over,
  };
}

function match(over: Partial<DuelMatch> = {}): DuelMatch {
  return {
    id: "m1",
    mode: "same-board",
    tempo: "live",
    clock: "rapid",
    rated: true,
    state: "round_active",
    players: [player("a"), player("b")],
    rounds: [round()],
    currentRound: 0,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
    ...over,
  };
}

describe("compareGrades", () => {
  it("ranks higher skill score first", () => {
    expect(compareGrades(grade({ score: 0.8 }), grade({ score: 0.5 }))).toBeGreaterThan(0);
    expect(compareGrades(grade({ score: 0.4 }), grade({ score: 0.6 }))).toBeLessThan(0);
  });

  it("breaks ties on lower Brier, then higher reasoning", () => {
    expect(compareGrades(grade({ score: 0.7, brier: 0.05 }), grade({ score: 0.7, brier: 0.2 }))).toBeGreaterThan(0);
    expect(
      compareGrades(
        grade({ score: 0.7, brier: 0.1, reasoning: 0.8 }),
        grade({ score: 0.7, brier: 0.1, reasoning: 0.5 }),
      ),
    ).toBeGreaterThan(0);
  });

  it("returns 0 for a genuine tie", () => {
    expect(compareGrades(grade(), grade())).toBe(0);
  });
});

describe("roundWinnerId", () => {
  it("is undefined until both grades exist", () => {
    const r = round({ grades: { a: grade() } });
    expect(roundWinnerId(r, ["a", "b"])).toBeUndefined();
  });

  it("picks the better call", () => {
    const r = round({ grades: { a: grade({ score: 0.8 }), b: grade({ score: 0.4 }) } });
    expect(roundWinnerId(r, ["a", "b"])).toBe("a");
  });

  it("returns null for a draw", () => {
    const r = round({ grades: { a: grade(), b: grade() } });
    expect(roundWinnerId(r, ["a", "b"])).toBeNull();
  });
});

describe("match resolution (same-board)", () => {
  it("is over after the single round and names a winner", () => {
    const m = match({
      rounds: [round({ state: "complete", winnerId: "a", grades: { a: grade({ score: 0.8 }), b: grade({ score: 0.4 }) } })],
    });
    expect(isMatchOver(m)).toBe(true);
    expect(matchWinnerId(m)).toBe("a");
    expect(resultFor(m, "a")).toBe(1);
    expect(resultFor(m, "b")).toBe(0);
  });

  it("is not over while waiting for an opponent", () => {
    expect(isMatchOver(match({ players: [player("a")] }))).toBe(false);
  });
});

describe("match resolution (best-of-3)", () => {
  const bo3 = (winners: (string | null)[]): DuelMatch =>
    match({
      mode: "best-of-3",
      rounds: winners.map((w, i) =>
        round({ index: i, state: "complete", winnerId: w, grades: { a: grade(), b: grade() } }),
      ),
    });

  it("ends as soon as a player reaches 2 wins", () => {
    const m = bo3(["a", "a"]);
    expect(isMatchOver(m)).toBe(true);
    expect(matchWinnerId(m)).toBe("a");
  });

  it("is undecided at one win apiece", () => {
    const m = bo3(["a", "b"]);
    expect(isMatchOver(m)).toBe(false);
    expect(matchWinnerId(m)).toBeUndefined();
  });

  it("counts round wins", () => {
    expect(tallyWins(bo3(["a", "b", "a"]))).toEqual({ a: 2, b: 1 });
  });

  it("draws when all rounds split with a tie", () => {
    const m = bo3(["a", "b", null]);
    expect(isMatchOver(m)).toBe(true);
    expect(matchWinnerId(m)).toBeNull();
    expect(resultFor(m, "a")).toBe(0.5);
  });
});

describe("duel Elo", () => {
  it("expected score is 0.5 for equal ratings", () => {
    expect(duelExpectedScore(1000, 1000)).toBeCloseTo(0.5, 6);
  });

  it("winning an even match gains points; losing loses them", () => {
    const win = updateDuelRating({ rating: 1000, opponentRating: 1000, result: 1, matchesPlayed: 0 });
    const loss = updateDuelRating({ rating: 1000, opponentRating: 1000, result: 0, matchesPlayed: 0 });
    expect(win.delta).toBeGreaterThan(0);
    expect(loss.delta).toBeLessThan(0);
    expect(win.delta).toBe(-loss.delta); // symmetric at equal ratings
  });

  it("beating a stronger opponent gains more than beating a weaker one", () => {
    const vsStrong = updateDuelRating({ rating: 1000, opponentRating: 1400, result: 1, matchesPlayed: 50 });
    const vsWeak = updateDuelRating({ rating: 1000, opponentRating: 600, result: 1, matchesPlayed: 50 });
    expect(vsStrong.delta).toBeGreaterThan(vsWeak.delta);
  });

  it("provisional K moves the rating faster", () => {
    const provisional = updateDuelRating({ rating: 1000, opponentRating: 1000, result: 1, matchesPlayed: 0 });
    const settled = updateDuelRating({ rating: 1000, opponentRating: 1000, result: 1, matchesPlayed: 100 });
    expect(provisional.delta).toBeGreaterThan(settled.delta);
  });

  it("rating never drops below the floor", () => {
    const u = updateDuelRating({ rating: 100, opponentRating: 2000, result: 0, matchesPlayed: 0 });
    expect(u.newRating).toBeGreaterThanOrEqual(100);
  });

  it("seeds duel rating from the judgment rating", () => {
    expect(seedDuelRating(1234)).toBe(1234);
    expect(seedDuelRating(NaN)).toBe(1000);
    expect(seedDuelRating(-50)).toBe(100);
  });
});

describe("forfeitGrade", () => {
  it("loses to any real call", () => {
    expect(compareGrades(grade({ score: 0.3 }), forfeitGrade())).toBeGreaterThan(0);
  });
});

describe("isExpired", () => {
  it("detects past deadlines", () => {
    expect(isExpired("2020-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:00.000Z"))).toBe(true);
    expect(isExpired("2030-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:00.000Z"))).toBe(false);
    expect(isExpired(undefined)).toBe(false);
  });
});

describe("duelName", () => {
  it("is deterministic and stable for the same id", () => {
    expect(duelName("device-123")).toBe(duelName("device-123"));
  });

  it("produces a two-word handle and varies by id", () => {
    expect(duelName("device-123")).toMatch(/^\S+ \S+$/);
    expect(duelName("device-123")).not.toBe(duelName("device-456"));
  });
});

describe("explainRound", () => {
  it("credits a clean win to the strongest edge", () => {
    const you = grade({ score: 0.82, brier: 0.04, reasoning: 0.9, correct: true });
    const opp = grade({ score: 0.55, brier: 0.04, reasoning: 0.4, correct: true });
    const ex = explainRound(you, opp, "win");
    expect(ex.headline).toBe("You took it");
    expect(ex.summary).toContain("reasoning");
    expect(ex.factors.find((f) => f.label === "Reasoning")?.edge).toBe("you");
  });

  it("explains a forfeit loss without comparing grades", () => {
    const ex = explainRound(forfeitGrade(), grade(), "loss");
    expect(ex.headline).toBe("No call in time");
    expect(ex.factors).toHaveLength(1);
  });

  it("calls a genuine tie a draw", () => {
    const g = grade({ score: 0.7, brier: 0.09, reasoning: 0.6 });
    const ex = explainRound(g, { ...g }, "draw");
    expect(ex.headline).toBe("Dead heat");
  });
});
