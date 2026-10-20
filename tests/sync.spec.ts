import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { buildSync } from "esbuild";
const BASE = process.env.BEDROCK_TEST_URL || "http://localhost:3000";
const script = buildSync({
  entryPoints: ["tests/sync-harness.tsx"],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"development"' },
}).outputFiles[0].text;
const password = "Bedrock-test-password-927!";
let contexts: BrowserContext[] = [];
async function open(browser: Browser) {
  const context = await browser.newContext();
  contexts.push(context);
  const page = await context.newPage();
  await page.route("**/sync-harness", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><div id="root"></div><script src="/sync-harness.js"></script>',
    }),
  );
  await page.route("**/sync-harness.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: script }),
  );
  await page.goto(`${BASE}/sync-harness`);
  await page.waitForFunction(() => (window as any).vault?.ready);
  return { page, context };
}
async function register(page: Page, email: string) {
  await page.evaluate(
    async ({ email, password }) =>
      (window as any).vault.register("Sync Tester", email, password),
    { email, password },
  );
  await page.waitForFunction(
    () => (window as any).vault.syncStatus === "synced",
  );
}
async function login(page: Page, email: string) {
  await page.evaluate(
    async ({ email, password }) => (window as any).vault.login(email, password),
    { email, password },
  );
  await page.waitForFunction(
    () => (window as any).vault.syncStatus === "synced",
  );
}
async function edit(page: Page, id: string, content: string) {
  await page.evaluate(
    ({ id, content }) => {
      const v = (window as any).vault;
      v.saveNote({ ...v.notes.find((n: any) => n.id === id), content });
    },
    { id, content },
  );
}
async function content(page: Page, id = "sync-seed") {
  return page.evaluate(
    (id) => (window as any).vault.notes.find((n: any) => n.id === id)?.content,
    id,
  );
}
test.afterEach(async () => {
  await Promise.all(contexts.map((c) => c.close()));
  contexts = [];
});
test("syncs between independent devices, queues offline changes, preserves conflicts, and isolates logout", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const email = `sync-${Date.now()}@example.test`;
  const first = await open(browser),
    second = await open(browser);
  await register(first.page, email);
  await login(second.page, email);
  await edit(first.page, "sync-seed", "First device edit");
  await expect
    .poll(() => content(second.page), { timeout: 12000 })
    .toBe("First device edit");
  await second.context.setOffline(true);
  await edit(second.page, "sync-seed", "Offline device edit");
  expect(await content(second.page)).toBe("Offline device edit");
  await second.page.reload();
  await second.page.waitForFunction(() => (window as any).vault?.ready);
  expect(await content(second.page)).toBe("Offline device edit");
  expect(
    await second.page.evaluate(() => (window as any).vault.user?.email),
  ).toBe(email);
  await expect
    .poll(() => second.page.evaluate(() => (window as any).vault.syncStatus))
    .toBe("offline");
  await second.context.setOffline(false);
  await expect
    .poll(() => content(first.page), { timeout: 12000 })
    .toBe("Offline device edit");
  await second.context.setOffline(true);
  await edit(second.page, "sync-seed", "Conflicting offline text");
  await edit(first.page, "sync-seed", "New server text");
  await first.page.waitForFunction(
    () => (window as any).vault.syncStatus === "synced",
  );
  await second.context.setOffline(false);
  await expect
    .poll(
      () =>
        second.page.evaluate(() =>
          (window as any).vault.notes
            .filter((n: any) => n.title.includes("conflict copy"))
            .map((n: any) => n.content),
        ),
      { timeout: 12000 },
    )
    .toContain("Conflicting offline text");
  await expect.poll(() => content(second.page)).toBe("New server text");
  await second.page.evaluate(async () => (window as any).vault.logout());
  expect(await content(second.page)).toBe("Guest note");
  expect(
    await second.page.evaluate(() => (window as any).vault.user),
  ).toBeNull();
  await second.page.reload();
  await second.page.waitForFunction(() => (window as any).vault?.ready);
  expect(await content(second.page)).toBe("Guest note");
  await login(second.page, email);
  expect(await content(second.page)).toBe("New server text");
});
test("keeps a later edit made while its previous save is in flight", async ({
  browser,
}) => {
  test.setTimeout(45000);
  const { page } = await open(browser);
  await register(page, `race-${Date.now()}@example.test`);
  let putCount = 0;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/notes/sync-seed", async (route) => {
    if (route.request().method() === "PUT" && ++putCount === 1) {
      await gate;
    }
    await route.continue();
  });
  await edit(page, "sync-seed", "First queued text");
  await expect.poll(() => putCount).toBe(1);
  await edit(page, "sync-seed", "Latest text during save");
  release();
  await page.waitForFunction(
    () => (window as any).vault.syncStatus === "synced",
  );
  expect(await content(page)).toBe("Latest text during save");
  const result = await page.evaluate(async () =>
    (await fetch("/api/notes")).json(),
  );
  expect(result.notes.find((n: any) => n.id === "sync-seed").content).toBe(
    "Latest text during save",
  );
  expect(putCount).toBe(2);
});
