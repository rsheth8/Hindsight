/**
 * Global test setup — deterministic env (no live API keys in CI).
 */
import { afterEach, vi } from "vitest";

const ENV_KEYS = [
  "FMP_API_KEY",
  "ANTHROPIC_API_KEY",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "NEXT_PUBLIC_APP_URL",
] as const;

const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

for (const key of ENV_KEYS) {
  saved[key] = process.env[key];
  delete process.env[key];
}

afterEach(() => {
  vi.restoreAllMocks();
});

export function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}
