import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { readJson } from "@/test/helpers/http";

describe("GET /api/practice", () => {
  it("requires seed", async () => {
    const res = await GET(new Request("http://localhost/api/practice"));
    expect(res.status).toBe(400);
  });

  it("returns problem without answer for valid seed", async () => {
    const res = await GET(new Request("http://localhost/api/practice?seed=test-seed-99&focus=hard"));
    expect(res.status).toBe(200);
    const body = await readJson<Record<string, unknown>>(res);
    expect(body).not.toHaveProperty("answer");
    expect(body).not.toHaveProperty("reveal");
    expect(String(body.id)).toMatch(/^practice-/);
  });

  it("defaults invalid focus to mixed", async () => {
    const res = await GET(new Request("http://localhost/api/practice?seed=test-seed-99&focus=invalid"));
    expect(res.status).toBe(200);
  });
});
