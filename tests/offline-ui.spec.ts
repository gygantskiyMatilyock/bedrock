import { test, expect } from "@playwright/test";
test("real app reopens offline with edits intact", async ({
  page,
  context,
}) => {
  await page.goto(process.env.BEDROCK_TEST_URL || "http://localhost:3000");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Note content")
    .fill("## Offline thoughts\n\nThis note survives an offline reload.");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Offline thoughts" }),
  ).toBeVisible();
  expect(await page.locator(".prose").textContent()).toContain(
    "survives an offline reload",
  );
  await context.setOffline(false);
});
