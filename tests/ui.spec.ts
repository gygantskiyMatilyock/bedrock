import { test, expect } from "@playwright/test";
const base = process.env.BEDROCK_TEST_URL || "http://127.0.0.1:3000";
test("create, edit, link, search, delete and restore a note", async ({
  page,
}) => {
  await page.goto(base);
  await expect(page.getByLabel("Note title", { exact: true })).toHaveValue(
    "A place for your thoughts",
  );
  await expect(page.locator(".wiki-link").first()).toHaveText(
    "The art of noticing",
  );
  await page.getByRole("button", { name: "Create note", exact: true }).click();
  await page
    .getByLabel("Note title", { exact: true })
    .last()
    .fill("Browser check");
  await page
    .getByRole("button", { name: "Create note", exact: true })
    .last()
    .click();
  await page
    .getByLabel("Note content")
    .fill("## A working note\n\nSaved and linked to [[The art of noticing]].");
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A working note" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Find anything" }).click();
  await page.getByLabel("Search your vault").fill("Browser check");
  await page
    .locator(".command-results")
    .getByRole("button", { name: "Browser check Ideas" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A working note" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Note options" }).click();
  await page.getByRole("button", { name: "Move to trash" }).click();
  await page
    .getByRole("button", { name: /All notes/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Trash", exact: true }).click();
  await page.locator(".note-card").filter({ hasText: "Browser check" }).click();
  await expect(page.getByRole("status")).toContainText("Note restored");
  await page.getByRole("button", { name: "Graph view", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your thoughts, connected." }),
  ).toBeVisible();
  await expect(page.locator(".knowledge-graph")).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "After hours" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("mobile layout and navigation", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.waitForTimeout(300);
  await expect(page.getByLabel("Note title", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await page.getByRole("button", { name: "Daily note", exact: true }).click();
  await expect(page.getByLabel("Note content")).toBeVisible();
  await context.close();
});
