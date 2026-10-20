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
  const newNote = page.getByRole("dialog", { name: "New note", exact: true });
  await newNote.getByLabel("Note title", { exact: true }).fill("Browser check");
  await newNote
    .getByRole("button", { name: "Create note", exact: true })
    .click();
  await page
    .getByLabel("Note content")
    .fill("## A working note\n\nSaved and linked to [[The art of noticing]].");
  await page.locator(".mode-toggle").click();
  await expect(
    page.getByRole("heading", { name: "A working note" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Find anything" }).click();
  await page
    .locator(".sidebar-search")
    .getByLabel("Search your vault")
    .fill("Browser check");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator(".quick-search-results .search-result")
    .filter({ hasText: "Browser check" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A working note" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Note options" }).click();
  await page.getByRole("button", { name: "Move to trash" }).click();
  await page
    .locator(".sidebar-actions")
    .getByRole("button", { name: "All notes", exact: true })
    .click();
  await page
    .locator(".collection-filter")
    .getByRole("button", { name: "Trash", exact: true })
    .click();
  await page.locator(".note-card").filter({ hasText: "Browser check" }).click();
  await expect(page.getByRole("status")).toContainText("Note restored");
  await expect(
    page.locator(".note-card").filter({ hasText: "Browser check" }),
  ).toHaveCount(0);

  await page.keyboard.press("Control+k");
  const quickSwitcher = page.getByRole("dialog", {
    name: "Quick switcher",
    exact: true,
  });
  await quickSwitcher.getByLabel("Search your vault").fill("Browser check");
  await quickSwitcher
    .locator(".command-results button")
    .filter({ hasText: "Browser check" })
    .click();
  await expect(page.getByLabel("Note title", { exact: true })).toHaveValue(
    "Browser check",
  );
  await expect(
    page.getByRole("heading", { name: "A working note" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Graph view", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Graph view", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".graph-page .knowledge-graph")).toBeVisible();
});

test("folders, bookmarks, tags, outline and links navigate the vault", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "New folder", exact: true })
    .click();
  const folderDialog = page.getByRole("dialog", {
    name: "New folder",
    exact: true,
  });
  await folderDialog.getByLabel("Folder name").fill("Research");
  await folderDialog
    .getByRole("button", { name: "Create folder", exact: true })
    .click();
  const folder = page.locator(".folder-group").filter({
    has: page.locator(".folder-row").getByText("Research", { exact: true }),
  });
  await folder.getByRole("button", { name: "New note", exact: true }).click();
  const newNote = page.getByRole("dialog", { name: "New note", exact: true });
  await expect(newNote.getByLabel("Add to")).toHaveValue("Research");
  await newNote.getByLabel("Note title", { exact: true }).fill("Workflow note");
  await newNote
    .getByRole("button", { name: "Create note", exact: true })
    .click();
  await page
    .getByLabel("Note content")
    .fill("## Outline target\n\nConnected to [[The art of noticing]].");
  await page.locator(".mode-toggle").click();
  await expect(
    folder.locator(".tree-note").filter({ hasText: "Workflow note" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Note options", exact: true }).click();
  await page
    .locator(".dropdown")
    .getByRole("button", { name: "Bookmark", exact: true })
    .click();
  await page
    .locator(".sidebar-header")
    .getByRole("button", { name: "Bookmarks", exact: true })
    .click();
  await expect(
    page.locator(".sidebar .sidebar-note").filter({ hasText: "Workflow note" }),
  ).toBeVisible();

  const details = page.locator(".details-panel");
  await details.getByRole("button", { name: "Outline", exact: true }).click();
  await details
    .getByRole("button", { name: "Outline target", exact: true })
    .click();
  await expect(
    page.locator(".prose").getByRole("heading", { name: "Outline target" }),
  ).toBeVisible();
  await details
    .getByRole("button", { name: "Outgoing links", exact: true })
    .click();
  await details
    .locator(".outline-item")
    .filter({ hasText: "The art of noticing" })
    .click();
  await expect(page.getByLabel("Note title", { exact: true })).toHaveValue(
    "The art of noticing",
  );
  await details.getByRole("button", { name: "Backlinks", exact: true }).click();
  await details
    .locator(".backlink-card")
    .filter({ hasText: "Workflow note" })
    .click();
  await expect(page.getByLabel("Note title", { exact: true })).toHaveValue(
    "Workflow note",
  );

  await page
    .locator(".sidebar-header")
    .getByRole("button", { name: "Tags", exact: true })
    .click();
  await page
    .locator(".tag-list button")
    .filter({ has: page.getByText("creativity", { exact: true }) })
    .click();
  await expect(
    page
      .locator(".collection-page")
      .getByRole("heading", { name: "#creativity", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".note-card").filter({ hasText: "The art of noticing" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".folder-row").getByText("Research", { exact: true }),
  ).toBeVisible();
});

test("pages take an icon, a cover and a folder from their properties", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await page.getByRole("button", { name: "Create note", exact: true }).click();
  const newNote = page.getByRole("dialog", { name: "New note", exact: true });
  await newNote.getByLabel("Note title", { exact: true }).fill("Styled page");
  await newNote
    .getByRole("button", { name: "Create note", exact: true })
    .click();
  await page.getByRole("button", { name: "Add icon", exact: true }).click();
  await page.getByRole("button", { name: "Change icon", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Choose an icon" })
    .getByRole("button", { name: "Use 🌿", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Change icon", exact: true }),
  ).toHaveText("🌿");
  await page.getByRole("button", { name: "Add cover", exact: true }).click();
  await page.locator(".page-cover").hover();
  await page.getByRole("button", { name: "Change cover", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Choose a cover" })
    .getByRole("button", { name: "Nebula cover", exact: true })
    .click();
  await page.getByLabel("Folder", { exact: true }).selectOption("Projects");
  await expect(
    page.locator(".doc-location").getByRole("button", { name: "Projects" }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Note title", { exact: true })).toBeVisible();
  await page.keyboard.press("Control+k");
  const quickSwitcher = page.getByRole("dialog", {
    name: "Quick switcher",
    exact: true,
  });
  await quickSwitcher.getByLabel("Search your vault").fill("Styled page");
  await quickSwitcher.getByLabel("Search your vault").press("Enter");
  await expect(
    page.getByRole("button", { name: "Change icon", exact: true }),
  ).toHaveText("🌿");
  await expect(page.locator(".page-cover")).toHaveAttribute(
    "style",
    /#1e1b4b|rgb\(30, 27, 75\)/,
  );
  await expect(page.getByLabel("Folder", { exact: true })).toHaveValue(
    "Projects",
  );
});

test("settings apply and persist theme and editor preferences", async ({
  page,
}) => {
  await page.goto(base);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.keyboard.press("Control+p");
  const commands = page.getByRole("dialog", {
    name: "Command palette",
    exact: true,
  });
  await commands.getByLabel("Search commands").fill("Open settings");
  await commands.getByLabel("Search commands").press("Enter");
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(settings.getByLabel("Base color scheme")).toHaveValue("system");
  await settings.getByLabel("Base color scheme").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await settings.getByRole("radio", { name: "Green", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "green");
  await settings
    .locator(".settings-nav")
    .getByRole("button", { name: "Editor", exact: true })
    .click();
  const fontSize = settings.getByRole("slider", {
    name: "Font size",
    exact: true,
  });
  await fontSize.focus();
  await fontSize.press("End");
  for (let step = 0; step < 4; step++) await fontSize.press("ArrowLeft");
  await expect(fontSize).toHaveValue("20");
  await settings
    .getByRole("switch", { name: "Spellcheck", exact: true })
    .click();
  await settings
    .getByRole("switch", { name: "Readable line length", exact: true })
    .click();
  await settings
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await page.locator(".mode-toggle").click();
  await expect(page.getByLabel("Note content")).toHaveAttribute(
    "spellcheck",
    "false",
  );
  await expect(page.getByLabel("Note content")).toHaveCSS("font-size", "20px");
  await expect(page.locator(".app")).toHaveClass(/wide-editor/);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "green");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(settings.getByLabel("Base color scheme")).toHaveValue("dark");
  await settings
    .locator(".settings-nav")
    .getByRole("button", { name: "Editor", exact: true })
    .click();
  await expect(fontSize).toHaveValue("20");
  await expect(
    settings.getByRole("switch", { name: "Spellcheck", exact: true }),
  ).toHaveAttribute("aria-checked", "false");
  await expect(
    settings.getByRole("switch", { name: "Readable line length", exact: true }),
  ).toHaveAttribute("aria-checked", "false");
  await settings
    .locator(".settings-nav")
    .getByRole("button", { name: "Files and links", exact: true })
    .click();
  await expect(
    settings.getByRole("button", { name: "Import", exact: true }),
  ).toBeVisible();
  await expect(
    settings.getByRole("button", { name: "Export", exact: true }),
  ).toBeVisible();
  await settings
    .locator(".settings-nav")
    .getByRole("button", { name: "Hotkeys", exact: true })
    .click();
  await expect(settings.locator(".settings-shortcuts")).toContainText(
    "Cmd / Ctrl K",
  );
  await settings
    .locator(".settings-nav")
    .getByRole("button", { name: "Sync", exact: true })
    .click();
  await expect(
    settings.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await settings
    .locator(".settings-nav")
    .getByRole("button", { name: "About", exact: true })
    .click();
  await expect(settings.locator(".settings-version")).toContainText(
    "Bedrock 3",
  );
});

test("mobile layout and navigation", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(base);
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
  await expect(page.locator(".sidebar")).not.toHaveClass(/mobile-open/);
  await page
    .locator(".mobile-navigation")
    .getByRole("button", { name: "Quick switcher", exact: true })
    .click();
  const quickSwitcher = page.getByRole("dialog", {
    name: "Quick switcher",
    exact: true,
  });
  await quickSwitcher
    .getByLabel("Search your vault")
    .fill("A place for your thoughts");
  await quickSwitcher
    .locator(".command-results button")
    .filter({ hasText: "A place for your thoughts" })
    .first()
    .click();
  await expect(page.getByLabel("Note title", { exact: true })).toHaveValue(
    "A place for your thoughts",
  );
  const mobileHeader = page.locator(".mobile-header");
  await mobileHeader
    .getByRole("button", { name: "Note options", exact: true })
    .click();
  await mobileHeader
    .getByRole("button", { name: "Show backlinks", exact: true })
    .click();
  const details = page.locator(".details-panel");
  await expect(details).toHaveClass(/mobile-visible/);
  await expect(details).toBeVisible();
  await expect(
    details
      .locator(".backlink-card")
      .filter({ hasText: "The art of noticing" }),
  ).toBeVisible();
  await details
    .getByRole("button", { name: "Close details panel", exact: true })
    .click();
  await expect(details).not.toBeVisible();
  await mobileHeader
    .getByRole("button", { name: "Note options", exact: true })
    .click();
  await mobileHeader
    .getByRole("button", { name: "Duplicate note", exact: true })
    .click();
  await expect(page.getByLabel("Note title", { exact: true })).toHaveValue(
    "A place for your thoughts (copy)",
  );
  await expect(page.getByLabel("Note content")).toHaveValue(
    /Welcome to \*\*Bedrock\*\*/,
  );
  await page
    .locator(".mobile-navigation")
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(page.locator(".sidebar")).toHaveClass(/mobile-open/);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings
    .locator(".settings-nav")
    .getByRole("button", { name: "Sync", exact: true })
    .click();
  await settings.getByRole("button", { name: "Sign in", exact: true }).click();
  const signIn = page.getByRole("dialog", {
    name: "Sign in to Bedrock",
    exact: true,
  });
  await expect(signIn.getByLabel("Email address")).toBeVisible();
  await expect(signIn.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(signIn.getByLabel("Your name", { exact: true })).toHaveCount(0);
  await context.close();
});
