import { describe, expect, it, afterEach } from "vitest";
import {
  hasFmpKey,
  hasAnthropicKey,
  hasSubmissionStore,
  appPublicUrl,
  serverMode,
} from "./env";

describe("env", () => {
  afterEach(() => {
    delete process.env.FMP_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("whitespace-only keys are false", () => {
    process.env.FMP_API_KEY = "   ";
    expect(hasFmpKey()).toBe(false);
  });

  it("hasSubmissionStore requires both KV vars", () => {
    process.env.KV_REST_API_URL = "https://x.upstash.io";
    expect(hasSubmissionStore()).toBe(false);
    process.env.KV_REST_API_TOKEN = "token";
    expect(hasSubmissionStore()).toBe(true);
  });

  it("appPublicUrl strips trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://hindsight.vercel.app/";
    expect(appPublicUrl()).toBe("https://hindsight.vercel.app");
  });

  it("serverMode reports fallback without keys", () => {
    expect(serverMode()).toEqual({
      fmp: "fallback",
      ai: "heuristic",
      submissions: "file",
    });
  });
});
