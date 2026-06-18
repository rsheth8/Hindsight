/**
 * End-to-end user journey tests — helpers live in-file because Playwright 1.61
 * fails test collection when spec files import local modules.
 */
import { test, expect, type Page } from "@playwright/test";

async function setupFreshPlayer(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("e2e.profile.reset") === "1") return;
    localStorage.removeItem("hindsight.profile.v1");
    localStorage.setItem("hindsight.onboarded.v1", "1");
    sessionStorage.setItem("e2e.profile.reset", "1");
  });
}

async function waitForDailyCommit(page: Page) {
  await page.getByText(/Hindsight · Daily/i).waitFor({ state: "visible", timeout: 15_000 });
  await page.getByText(/how sure are you/i).waitFor({ state: "visible" });
}

async function selectChoice(page: Page, id: "A" | "B" | "C" = "B") {
  await page
    .getByRole("button")
    .filter({ has: page.getByText(id, { exact: true }) })
    .first()
    .click();
}

async function pickFirstReasoningChip(page: Page) {
  const section = page.locator(".card").filter({ hasText: /What are you seeing/i });
  await section.getByRole("button").first().click();
}

async function submitCall(page: Page) {
  await page.getByRole("button", { name: /Lock in your call/i }).click();
}

async function completeCommitRound(page: Page, choice: "A" | "B" | "C" = "B") {
  await selectChoice(page, choice);
  await pickFirstReasoningChip(page);
  await submitCall(page);
}

async function waitForDailyReveal(page: Page) {
  await page.getByText("How players answered").waitFor({ state: "visible", timeout: 45_000 });
  await page.getByText(/What you just practiced/i).waitFor({ state: "visible" });
}

async function waitForPracticeReveal(page: Page) {
  await page.getByText(/Practice · no streak/i).waitFor({ state: "visible", timeout: 45_000 });
  await page.getByRole("button", { name: /Another one/i }).waitFor({ state: "visible" });
}

async function waitForBlindReveal(page: Page) {
  await page.getByText(/Blind replay · \d+ days seen/i).waitFor({ state: "visible", timeout: 45_000 });
  await page.getByRole("button", { name: /Back to Practice/i }).waitFor({ state: "visible" });
}

async function startPracticeRound(page: Page) {
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: /^Practice$/ })).toBeVisible();
  const practiceReq = page.waitForResponse((r) => r.url().includes("/api/practice") && r.ok());
  await page.getByRole("button", { name: /Read the setup/i }).click();
  await practiceReq;
  await expect(page.getByText(/how sure are you/i)).toBeVisible({ timeout: 15_000 });
}

async function navigateTab(page: Page, label: "Daily" | "Practice" | "Rank" | "Journal" | "You") {
  await page.getByRole("link", { name: label, exact: true }).click();
}

// ── Navigation ───────────────────────────────────────────────────────────────

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => setupFreshPlayer(page));

  test("home redirects to daily", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/daily$/);
    await waitForDailyCommit(page);
  });

  test("bottom nav reaches every main screen", async ({ page }) => {
    await page.goto("/daily");
    await waitForDailyCommit(page);

    await navigateTab(page, "Practice");
    await expect(page.getByRole("heading", { name: /^Practice$/ })).toBeVisible();

    await navigateTab(page, "Rank");
    await expect(page.getByRole("heading", { name: /^Rank$/ })).toBeVisible();

    await navigateTab(page, "Journal");
    await expect(page.getByText(/No calls yet/i)).toBeVisible();

    await navigateTab(page, "You");
    await expect(page.getByText("Investing rating")).toBeVisible();

    await navigateTab(page, "Daily");
    await waitForDailyCommit(page);
  });
});

// ── Daily ────────────────────────────────────────────────────────────────────

test.describe("Daily game flow", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });
  test.beforeEach(async ({ page }) => setupFreshPlayer(page));

  test("commit gates: choice + reasoning required", async ({ page }) => {
    await page.goto("/daily");
    await waitForDailyCommit(page);

    const submit = page.getByRole("button", { name: /Lock in your call/i });
    await expect(submit).toBeDisabled();
    await selectChoice(page, "A");
    await expect(submit).toBeDisabled();
    await pickFirstReasoningChip(page);
    await expect(submit).toBeEnabled();
  });

  test("confidence slider and provisional rating UX", async ({ page }) => {
    await page.goto("/daily");
    await waitForDailyCommit(page);
    await expect(page.getByText("70%")).toBeVisible();
    await page.locator('input[type="range"]').fill("85");
    await expect(page.getByText("85%")).toBeVisible();
    await expect(page.getByText(/Provisional rating/i)).toBeVisible();
  });

  test("full round: commit → reveal → done today", async ({ page }) => {
    await page.goto("/daily");
    await waitForDailyCommit(page);
    await completeCommitRound(page, "B");
    await waitForDailyReveal(page);

    await expect(page.getByText("Outcome", { exact: true })).toBeVisible();
    await expect(page.getByText("It was", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "analyst" }).click();

    await page.reload();
    await expect(page.getByText(/done for today/i)).toBeVisible({ timeout: 15_000 });
  });
});

// ── Practice ─────────────────────────────────────────────────────────────────

test.describe("Practice flow", () => {
  test.beforeEach(async ({ page }) => setupFreshPlayer(page));

  test("hub → setup → reveal → hub", async ({ page }) => {
    await startPracticeRound(page);

    await completeCommitRound(page, "A");
    await waitForPracticeReveal(page);
    await expect(page.getByText(/What you practiced/i)).toBeVisible();

    await page.getByRole("button", { name: /Back to Practice hub/i }).click();
    await expect(page.getByRole("heading", { name: /^Practice$/ })).toBeVisible();
  });

  test("another one starts fresh round", async ({ page }) => {
    await startPracticeRound(page);
    await completeCommitRound(page, "B");
    await waitForPracticeReveal(page);
    await page.getByRole("button", { name: /Another one/i }).click();
    await expect(page.getByRole("button", { name: /Lock in your call/i })).toBeDisabled();
  });
});

// ── Blind replay ─────────────────────────────────────────────────────────────

test.describe("Blind replay flow", () => {
  test.beforeEach(async ({ page }) => setupFreshPlayer(page));

  test("enter, advance chart, play round, exit", async ({ page }) => {
    await page.goto("/practice");
    await page.getByRole("button", { name: /Blind replay/i }).click();
    await expect(page.getByText(/Watch the chart unfold/i)).toBeVisible({ timeout: 15_000 });

    const advance = page.getByRole("button", { name: /Reveal next \d+ days/i });
    if (await advance.isVisible()) await advance.click();

    await completeCommitRound(page, "B");
    await waitForBlindReveal(page);
    await page.getByRole("button", { name: /Back to Practice/i }).click();
    await expect(page.getByRole("heading", { name: /^Practice$/ })).toBeVisible();
  });
});

// ── Profile screens ──────────────────────────────────────────────────────────

test.describe("Profile screens", () => {
  test.describe("empty state", () => {
    test.beforeEach(async ({ page }) => setupFreshPlayer(page));

    test("You, Rank, Journal starter content", async ({ page }) => {
      await page.goto("/you");
      await expect(page.getByText("1000?")).toBeVisible();
      await expect(page.getByText(/Real-money bridge/i)).toBeVisible();

      await page.goto("/rank");
      await expect(page.getByRole("heading", { name: "Skill tree" })).toBeVisible();

      await page.goto("/journal");
      await expect(page.getByText(/No calls yet/i)).toBeVisible();
    });
  });

  test.describe("after gameplay", () => {
    test.describe.configure({ mode: "serial", timeout: 90_000 });
    test.beforeEach(async ({ page }) => setupFreshPlayer(page));

    test("journal accumulates daily + practice entries", async ({ page }) => {
      await page.goto("/daily");
      await waitForDailyCommit(page);
      await completeCommitRound(page, "B");
      await waitForDailyReveal(page);

      await page.goto("/practice");
      await startPracticeRound(page);
      await completeCommitRound(page, "A");
      await waitForPracticeReveal(page);

      await page.getByRole("link", { name: "Journal", exact: true }).click();
      await expect(page.getByText(/No calls yet/i)).not.toBeVisible();
      await expect(page.getByText("practice", { exact: true })).toBeVisible();
      await expect(page.locator(".card").filter({ hasText: /reasoning \d+/i }).first()).toBeVisible();

      await page.getByRole("link", { name: "You", exact: true }).click();
      await expect(page.getByText("1000?")).not.toBeVisible();
      await expect(page.getByText(/Accuracy/i)).toBeVisible();
    });
  });
});
