import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = process.env.E2E_PORT ?? "3001";
const E2E_BASE = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: E2E_BASE,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Dedicated port so local `npm run dev` on :3000 doesn't hijack E2E (dev HMR breaks headless hydration).
    command: `npm run build && PORT=${E2E_PORT} FMP_API_KEY= ANTHROPIC_API_KEY= npm run start`,
    url: `${E2E_BASE}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
