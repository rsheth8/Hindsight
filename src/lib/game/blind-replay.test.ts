import { describe, expect, it } from "vitest";
import {
  BLIND_START_DAYS,
  BLIND_MAX_DAYS,
  BLIND_STEP_DAYS,
  getBlindReplayProblem,
  resolveBlindProblem,
} from "./blind-replay";

describe("blind-replay", () => {
  it("visible=0 clamps to BLIND_START_DAYS", async () => {
    const { visibleDays, client } = await getBlindReplayProblem("br-test-1", "mixed", 0);
    expect(visibleDays).toBe(BLIND_START_DAYS);
    expect(client.series.length).toBe(BLIND_START_DAYS);
  });

  it("client problem id is blind-prefixed", async () => {
    const { client } = await getBlindReplayProblem("br-test-2", "mixed", 42);
    expect(client.id.startsWith("blind-practice-blind-br-test-2")).toBe(true);
  });

  it("resolveBlindProblem returns full series regardless of visible window", async () => {
    const truncated = await getBlindReplayProblem("br-test-3", "mixed", 42);
    const full = await resolveBlindProblem("br-test-3", "mixed", 42);
    expect(full.series.length).toBeGreaterThan(truncated.client.series.length);
    expect(full.answer).toBeDefined();
  });

  it("canAdvance false at max visible cap", async () => {
    const { visibleDays } = await getBlindReplayProblem("br-test-4", "mixed", BLIND_MAX_DAYS);
    expect(visibleDays).toBe(BLIND_MAX_DAYS);
  });

  it("step days constant is 7", () => {
    expect(BLIND_STEP_DAYS).toBe(7);
  });
});
