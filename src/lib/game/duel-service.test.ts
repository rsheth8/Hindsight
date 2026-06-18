import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSolvedProblem } from "@/test/fixtures/problem";
import type { PlayerSlot } from "./duel";

// Deterministic problem for every round seed (both players see the same one).
vi.mock("@/lib/game/daily", () => ({
  buildProblemForSeed: vi.fn(async () => mockSolvedProblem({ answer: "A" })),
}));

// Reasoning grade keyed off the text so we can engineer a clear winner.
vi.mock("@/lib/ai/grade", () => ({
  gradeReasoning: vi.fn(async ({ reasoning }: { reasoning: string }) => ({
    score: reasoning.includes("strong") ? 0.9 : 0.4,
    notes: "ok",
  })),
}));

// In-memory store so the service state machine is tested hermetically.
vi.mock("@/lib/db/duel-store", () => {
  const matches = new Map<string, unknown>();
  let queue: { playerId: string; matchId: string; mode: string; tempo: string; rated: boolean; rating: number }[] = [];
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  return {
    _resetDuelCacheForTests: () => {
      matches.clear();
      queue = [];
    },
    getMatch: vi.fn(async (id: string) => (matches.has(id) ? clone(matches.get(id)) : null)),
    saveMatch: vi.fn(async (m: { id: string }) => {
      matches.set(m.id, clone(m));
    }),
    enqueue: vi.fn(async (e: { playerId: string }) => {
      queue = queue.filter((x) => x.playerId !== e.playerId);
      // @ts-expect-error test shape
      queue.push(e);
    }),
    removeFromQueue: vi.fn(async (pred: (e: unknown) => boolean) => {
      queue = queue.filter((x) => !pred(x));
    }),
    popOpponent: vi.fn(async (c: { selfId: string; mode: string; tempo: string; rated: boolean; rating: number; band?: number }) => {
      const band = c.band ?? 150;
      const idx = queue.findIndex(
        (e) => e.playerId !== c.selfId && e.mode === c.mode && e.tempo === c.tempo && e.rated === c.rated && Math.abs(e.rating - c.rating) <= band,
      );
      if (idx < 0) return null;
      const [e] = queue.splice(idx, 1);
      return e;
    }),
  };
});

import { commit, createMatch, joinMatch, viewMatch, DuelError } from "./duel-service";
import { _resetDuelCacheForTests } from "@/lib/db/duel-store";

const p1: PlayerSlot = { id: "dev-p1", name: "P1", duelRating: 1000, duelMatchesPlayed: 0 };
const p2: PlayerSlot = { id: "dev-p2", name: "P2", duelRating: 1000, duelMatchesPlayed: 0 };

beforeEach(() => {
  _resetDuelCacheForTests();
});

describe("duel service — friend challenge flow", () => {
  it("runs a full same-board match and crowns the sharper read", async () => {
    const created = await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p1, kind: "friend" });
    expect(created.joined).toBe(false);
    expect(created.match.state).toBe("waiting_opponent");
    const matchId = created.match.id;

    const joined = await joinMatch(matchId, p2);
    expect(joined.state).toBe("round_active");
    expect(joined.players).toHaveLength(2);

    // P1 locks in first with strong reasoning.
    const afterP1 = await commit(matchId, p1.id, { choice: "A", confidence: 0.7, reasoning: "strong uptrend, sized to evidence" });
    expect(afterP1.state).toBe("round_active");

    // From P2's view the opponent has committed but nothing leaks.
    const p2View = await viewMatch(matchId, p2.id);
    expect(p2View.rounds[0].opponentCommitted).toBe(true);
    expect(p2View.rounds[0].youCommitted).toBe(false);
    expect(p2View.rounds[0].grades).toBeUndefined();

    // P2 locks in with weaker reasoning → match resolves.
    const done = await commit(matchId, p2.id, { choice: "A", confidence: 0.7, reasoning: "felt right" });
    expect(done.state).toBe("match_end");
    expect(done.winnerId).toBe(p1.id);
    expect(done.rounds[0].reveal?.ticker).toBe("TEST");
    expect(done.rounds[0].grades).toBeDefined();

    const p1Done = await viewMatch(matchId, p1.id);
    expect(p1Done.rounds[0].yourReasoning).toBe("strong uptrend, sized to evidence");
    expect(p1Done.rounds[0].opponentReasoning).toBe("felt right");

    const p2Done = await viewMatch(matchId, p2.id);
    expect(p2Done.rounds[0].yourReasoning).toBe("felt right");
    expect(p2Done.rounds[0].opponentReasoning).toBe("strong uptrend, sized to evidence");
  });

  it("applies symmetric duel rating deltas at equal ratings", async () => {
    const created = await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p1, kind: "friend" });
    const matchId = created.match.id;
    await joinMatch(matchId, p2);
    await commit(matchId, p1.id, { choice: "A", confidence: 0.7, reasoning: "strong evidence" });
    const done = await commit(matchId, p2.id, { choice: "A", confidence: 0.7, reasoning: "guess" });

    const winner = done.players.find((p) => p.id === p1.id)!;
    const loser = done.players.find((p) => p.id === p2.id)!;
    expect(winner.duelDelta).toBeGreaterThan(0);
    expect(loser.duelDelta).toBeLessThan(0);
    expect(winner.duelDelta).toBe(-(loser.duelDelta ?? 0));
    expect(winner.duelRatingAfter).toBe(1000 + (winner.duelDelta ?? 0));
  });

  it("rejects a second commit from the same player", async () => {
    const created = await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p1, kind: "friend" });
    const matchId = created.match.id;
    await joinMatch(matchId, p2);
    await commit(matchId, p1.id, { choice: "A", confidence: 0.7, reasoning: "strong" });
    await expect(commit(matchId, p1.id, { choice: "B", confidence: 0.5, reasoning: "again" })).rejects.toBeInstanceOf(DuelError);
  });

  it("blocks a non-participant from committing", async () => {
    const created = await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p1, kind: "friend" });
    const matchId = created.match.id;
    await joinMatch(matchId, p2);
    await expect(
      commit(matchId, "dev-intruder", { choice: "A", confidence: 0.7, reasoning: "strong" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("duel service — matchmaking queue", () => {
  it("pairs the second queued player with the first", async () => {
    const first = await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p1, kind: "queue" });
    expect(first.joined).toBe(false);
    expect(first.match.state).toBe("waiting_opponent");

    const second = await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p2, kind: "queue" });
    expect(second.joined).toBe(true);
    expect(second.match.state).toBe("round_active");
    expect(second.match.id).toBe(first.match.id);
  });

  it("does not pair across different modes", async () => {
    await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p1, kind: "queue" });
    const second = await createMatch({ mode: "best-of-3", tempo: "live", clock: "rapid", rated: true, player: p2, kind: "queue" });
    expect(second.joined).toBe(false);
  });
});

describe("duel service — AI opponents (cold-start fill)", () => {
  beforeEach(() => {
    vi.stubEnv("DUEL_BOT_FILL_MS", "0"); // fill instantly on first poll
  });

  it("fills an idle queue lobby with a bot and plays a full match", async () => {
    const created = await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p1, kind: "queue" });
    expect(created.match.state).toBe("waiting_opponent");

    // The waiting poll bot-fills and the bot locks in immediately.
    const filled = await viewMatch(created.match.id, p1.id);
    expect(filled.state).toBe("round_active");
    expect(filled.players).toHaveLength(2);
    const bot = filled.players.find((p) => p.id !== p1.id)!;
    expect(bot.isBot).toBe(true);
    expect(filled.rounds[0].opponentCommitted).toBe(true); // bot already in
    expect(filled.rounds[0].grades).toBeUndefined(); // but nothing leaks pre-commit

    // Human commits → match resolves against the bot, rating applied.
    const done = await commit(created.match.id, p1.id, { choice: "A", confidence: 0.7, reasoning: "strong evidence" });
    expect(done.state).toBe("match_end");
    expect(done.players.find((p) => p.id === p1.id)?.duelDelta).toBeTypeOf("number");
  });

  it("never bot-fills a friend challenge", async () => {
    const created = await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p1, kind: "friend" });
    const view = await viewMatch(created.match.id, p1.id);
    expect(view.state).toBe("waiting_opponent");
    expect(view.players).toHaveLength(1);
  });
});

describe("duel service — reveal disclosure", () => {
  it("hides opponent reasoning on ranked queue matches", async () => {
    const first = await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p1, kind: "queue" });
    await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p2, kind: "queue" });
    const matchId = first.match.id;
    await commit(matchId, p1.id, { choice: "A", confidence: 0.7, reasoning: "strong read" });
    const done = await commit(matchId, p2.id, { choice: "A", confidence: 0.7, reasoning: "weak read" });

    expect(done.challengeCode).toBeUndefined();
    expect(done.rounds[0].yourReasoning).toBe("weak read");
    expect(done.rounds[0].opponentReasoning).toBeUndefined();
  });

  it("still hides commits before both players lock in", async () => {
    const created = await createMatch({ mode: "same-board", tempo: "live", clock: "rapid", rated: true, player: p1, kind: "friend" });
    const matchId = created.match.id;
    await joinMatch(matchId, p2);
    await commit(matchId, p1.id, { choice: "A", confidence: 0.7, reasoning: "strong uptrend" });
    const mid = await viewMatch(matchId, p2.id);
    expect(mid.rounds[0].yourReasoning).toBeUndefined();
    expect(mid.rounds[0].opponentReasoning).toBeUndefined();
  });
});
