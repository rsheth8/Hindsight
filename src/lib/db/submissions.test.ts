import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "fs/promises";
import path from "path";
import {
  saveSubmission,
  getSubmissionsForProblem,
  crowdForProblem,
  _resetSubmissionsCacheForTests,
} from "./submissions";

const DATA_FILE = path.join(process.cwd(), ".data", "submissions.json");

describe("submissions", () => {
  beforeEach(async () => {
    _resetSubmissionsCacheForTests();
    await mkdir(path.dirname(DATA_FILE), { recursive: true });
    await rm(DATA_FILE, { force: true });
  });

  afterEach(async () => {
    _resetSubmissionsCacheForTests();
    await rm(DATA_FILE, { force: true });
  });

  async function save(deviceId: string, problemId: string, choice: "A" | "B" | "C" = "A") {
    return saveSubmission({
      deviceId,
      problemId,
      problemDate: "2026-06-17",
      choice,
      confidence: 0.7,
      correct: true,
      brier: 0.09,
      reasoningScore: 0.6,
      ratingDelta: 10,
    });
  }

  it("dedupes same device+problem", async () => {
    await save("dev1", "prob1", "A");
    await save("dev1", "prob1", "B");
    const subs = await getSubmissionsForProblem("prob1");
    expect(subs).toHaveLength(1);
    expect(subs[0].choice).toBe("B");
  });

  it("crowdReal false below 3 submissions", async () => {
    await save("d1", "crowd-prob");
    await save("d2", "crowd-prob");
    const { crowdReal, sampleSize } = await crowdForProblem("crowd-prob", { A: 30, B: 40, C: 30 });
    expect(crowdReal).toBe(false);
    expect(sampleSize).toBe(2);
  });

  it("crowdReal true at 3+ submissions", async () => {
    await save("d1", "crowd-prob2", "A");
    await save("d2", "crowd-prob2", "A");
    await save("d3", "crowd-prob2", "B");
    const { crowdReal, crowd, sampleSize } = await crowdForProblem("crowd-prob2", { A: 30, B: 40, C: 30 });
    expect(crowdReal).toBe(true);
    expect(sampleSize).toBe(3);
    expect(crowd.A + crowd.B + crowd.C).toBeGreaterThanOrEqual(98);
    expect(crowd.A + crowd.B + crowd.C).toBeLessThanOrEqual(101);
  });
});
