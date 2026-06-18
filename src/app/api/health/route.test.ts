import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { readJson } from "@/test/helpers/http";

describe("GET /api/health", () => {
  it("returns ok and mode flags", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await readJson<{ ok: boolean; mode: { fmp: string; ai: string; submissions: string } }>(res);
    expect(body.ok).toBe(true);
    expect(body.mode.fmp).toBe("fallback");
    expect(body.mode.ai).toBe("heuristic");
  });
});
