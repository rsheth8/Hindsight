import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { readJson } from "@/test/helpers/http";
import { BLIND_START_DAYS, BLIND_STEP_DAYS } from "@/lib/game/blind-replay";

describe("GET /api/blind-replay", () => {
  it("requires seed", async () => {
    const res = await GET(new Request("http://localhost/api/blind-replay"));
    expect(res.status).toBe(400);
  });

  it("returns truncated problem and meta", async () => {
    const res = await GET(new Request("http://localhost/api/blind-replay?seed=br-api-test&focus=mixed&visible=0"));
    expect(res.status).toBe(200);
    const body = await readJson<{
      problem: { series: unknown[]; id: string };
      visibleDays: number;
      stepDays: number;
      canAdvance: boolean;
    }>(res);
    expect(body.visibleDays).toBe(BLIND_START_DAYS);
    expect(body.stepDays).toBe(BLIND_STEP_DAYS);
    expect(body.problem.series.length).toBe(BLIND_START_DAYS);
    expect(body.problem.id.startsWith("blind-")).toBe(true);
    expect(body).not.toHaveProperty("answer");
  });
});
