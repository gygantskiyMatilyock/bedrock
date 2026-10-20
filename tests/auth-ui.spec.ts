import { test, expect } from "@playwright/test";

test("account form creates private vault and shows acknowledged sync", async ({
  page,
}) => {
  await page.goto(process.env.BEDROCK_TEST_URL || "http://localhost:3000");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Sync", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Bedrock QA");
  const email = `qa-${crypto.randomUUID()}@bedrock.example`;
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Temporary-Bedrock-123!");
  await page.getByRole("button", { name: "Create my vault" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".sync-status")).toContainText(
    "All changes synced",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings
    .locator(".settings-nav")
    .getByRole("button", { name: "Sync", exact: true })
    .click();
  await expect(settings.locator(".settings-user")).toContainText(email);
  await expect(settings.locator(".settings-user")).toContainText("Bedrock QA");
  await expect(settings.locator(".setting-value")).toContainText(
    "All changes synced",
  );
  await settings.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".sync-status")).toContainText(
    "Saved on this device",
  );
});
