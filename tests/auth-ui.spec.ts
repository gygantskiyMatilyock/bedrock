import { test, expect } from "@playwright/test";
test("account form creates private vault and shows acknowledged sync", async ({
  page,
}) => {
  await page.goto(process.env.BEDROCK_TEST_URL || "http://localhost:3000");
  await page.getByRole("button", { name: /A home on every device/ }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Bedrock QA");
  await page
    .getByLabel("Email address")
    .fill(`qa-${crypto.randomUUID()}@bedrock.example`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Temporary-Bedrock-123!");
  await page.getByRole("button", { name: "Create my vault" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".sync-status")).toContainText(
    "All changes synced",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByText(/Signed in as qa-/)).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator(".sync-status")).toContainText(
    "Saved on this device",
  );
});
