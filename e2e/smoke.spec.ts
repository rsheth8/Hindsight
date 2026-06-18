import { test, expect } from "@playwright/test";

test.describe("API smoke", () => {
  test("health endpoint reports mode", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.mode).toHaveProperty("fmp");
  });

  test("daily problem loads without answer leak", async ({ request }) => {
    const res = await request.get("/api/daily");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).not.toHaveProperty("answer");
    expect(body).not.toHaveProperty("reveal");
    expect(body.choices).toHaveLength(3);
    expect(body.series?.length).toBeGreaterThan(10);
  });

  test("grade rejects empty reasoning", async ({ request }) => {
    const res = await request.post("/api/grade", {
      data: {
        choice: "A",
        confidence: 0.7,
        reasoning: "",
        rating: 1000,
        gradedCount: 0,
      },
    });
    expect(res.status()).toBe(400);
  });

  test("grade accepts valid submission", async ({ request }) => {
    const daily = await request.get("/api/daily");
    expect(daily.ok()).toBeTruthy();

    const res = await request.post("/api/grade", {
      data: {
        choice: "B",
        confidence: 0.65,
        reasoning: "Range-bound setup with moderate volatility however upside capped near highs",
        rating: 1000,
        gradedCount: 0,
        depth: "learn",
        deviceId: "e2e-test-device",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("newRating");
    expect(body).toHaveProperty("explanation");
    expect(body).toHaveProperty("reveal");
  });
});

test.describe("Web UI smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("hindsight.onboarded.v1", "1");
    });
  });

  test("daily page loads commit UI", async ({ page }) => {
    await page.goto("/daily");
    await expect(page.getByText(/Hindsight · Daily/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/how sure are you/i)).toBeVisible();
  });

  test("privacy and support pages render", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
    await page.goto("/support");
    await expect(page.getByRole("heading", { name: /support/i })).toBeVisible();
  });

  test("practice hub loads", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /practice/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /read the setup/i })).toBeVisible();
  });
});
