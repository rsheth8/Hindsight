import { test, expect } from "@playwright/test";

test.describe("Onboarding", () => {
  test.describe("first visit", () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.removeItem("hindsight.onboarded.v1");
        localStorage.removeItem("hindsight.profile.v1");
      });
    });

    test("first-time user sees intro slides", async ({ page }) => {
    await page.goto("/daily");
    await expect(page.getByRole("heading", { name: /One call a day/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
  });

  test("skip onboarding lands on daily commit screen", async ({ page }) => {
    await page.goto("/daily");
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByText(/Hindsight · Daily/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Lock in your call/i })).toBeDisabled();
  });

  test("complete onboarding via all slides", async ({ page }) => {
    await page.goto("/daily");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: /We grade your thinking/i })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: /A rating that compounds/i })).toBeVisible();
    await page.getByRole("button", { name: /Play today's problem/i }).click();
    await expect(page.getByText(/Hindsight · Daily/i)).toBeVisible({ timeout: 15_000 });
    });
  });

  test("onboarding does not repeat after completion", async ({ page }) => {
    await page.goto("/daily");
    await page.evaluate(() => {
      localStorage.removeItem("hindsight.onboarded.v1");
      localStorage.removeItem("hindsight.profile.v1");
    });
    await page.reload();

    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByText(/Hindsight · Daily/i)).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByRole("heading", { name: /One call a day/i })).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Hindsight · Daily/i)).toBeVisible({ timeout: 15_000 });
  });
});
