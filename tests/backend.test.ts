import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server";

const apps: ReturnType<typeof createApp>[] = [];
afterEach(() => {
  for (const app of apps.splice(0)) app.close();
});

function setup() {
  const app = createApp(":memory:");
  apps.push(app);
  const request = async (
    path: string,
    method = "GET",
    body?: unknown,
    cookie = "",
    headers: Record<string, string> = {},
  ) =>
    app.handleRequest(
      new Request(`http://localhost:3000${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  return { app, request };
}

async function register(
  request: ReturnType<typeof setup>["request"],
  email = "one@example.com",
) {
  const response = await request("/api/auth/register", "POST", {
    name: "Reader",
    email,
    password: "a-long-safe-password",
  });
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  return { cookie, user: (await response.json()).user };
}

const note = {
  title: "First thought",
  content: "A link to [[Another note]]",
  folder: "Ideas",
  tags: ["ideas"],
  starred: false,
  version: 0,
  deleted: false,
};

describe("private vault API", () => {
  test("stores page icons and covers, and rejects malformed covers", async () => {
    const { request } = setup();
    const { cookie } = await register(request);
    const saved = await request(
      "/api/notes/styled",
      "PUT",
      { ...note, icon: "🌿", cover: "aurora" },
      cookie,
    );
    expect(saved.status).toBe(200);
    expect((await saved.json()).note).toMatchObject({
      icon: "🌿",
      cover: "aurora",
    });
    const plain = await request("/api/notes/plain", "PUT", note, cookie);
    expect((await plain.json()).note).toMatchObject({ icon: "", cover: "" });
    expect(
      (
        await request(
          "/api/notes/bad-cover",
          "PUT",
          { ...note, cover: "url(javascript:alert(1))" },
          cookie,
        )
      ).status,
    ).toBe(400);
  });

  test("registers, authenticates, and revokes a session on logout", async () => {
    const { request } = setup();
    const { cookie, user } = await register(request);
    expect(
      (await (await request("/api/auth/me", "GET", undefined, cookie)).json())
        .user.id,
    ).toBe(user.id);
    expect(
      (
        await request("/api/auth/login", "POST", {
          email: user.email,
          password: "wrong-password",
        })
      ).status,
    ).toBe(401);
    const login = await request("/api/auth/login", "POST", {
      email: user.email,
      password: "a-long-safe-password",
    });
    expect(login.status).toBe(200);
    expect(login.headers.get("set-cookie")).toContain("HttpOnly");
    await request("/api/auth/logout", "POST", undefined, cookie);
    expect(
      (await (await request("/api/auth/me", "GET", undefined, cookie)).json())
        .user,
    ).toBeNull();
    expect((await request("/api/notes", "GET", undefined, cookie)).status).toBe(
      401,
    );
  });

  test("isolates accounts and rejects unauthenticated writes", async () => {
    const { request } = setup();
    const first = await register(request);
    const second = await register(request, "two@example.com");
    expect((await request("/api/notes/note-1", "PUT", note)).status).toBe(401);
    expect(
      (await request("/api/notes/note-1", "PUT", note, first.cookie)).status,
    ).toBe(200);
    expect(
      (
        await (
          await request("/api/notes", "GET", undefined, second.cookie)
        ).json()
      ).notes,
    ).toHaveLength(0);
    expect(
      (
        await request(
          "/api/notes/note-1",
          "DELETE",
          { version: 1 },
          second.cookie,
        )
      ).status,
    ).toBe(409);
    const own = await (
      await request("/api/notes", "GET", undefined, first.cookie)
    ).json();
    expect(own.notes[0].content).toBe(note.content);
  });

  test("detects conflicting edits and keeps deletion tombstones", async () => {
    const { request } = setup();
    const { cookie } = await register(request);
    const created = await (
      await request("/api/notes/note-1", "PUT", note, cookie)
    ).json();
    expect(created.note.version).toBe(1);
    const updated = await (
      await request(
        "/api/notes/note-1",
        "PUT",
        { ...note, version: 1, content: "New edit" },
        cookie,
      )
    ).json();
    expect(updated.note.version).toBe(2);
    const conflict = await request(
      "/api/notes/note-1",
      "PUT",
      { ...note, version: 1, content: "Stale edit" },
      cookie,
    );
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).note.content).toBe("New edit");
    const removed = await (
      await request("/api/notes/note-1", "DELETE", { version: 2 }, cookie)
    ).json();
    expect(removed.note.deleted).toBe(true);
    expect(removed.note.version).toBe(3);
    const synced = await (
      await request("/api/notes", "GET", undefined, cookie)
    ).json();
    expect(synced.notes[0].deleted).toBe(true);
    const restore = await (
      await request("/api/notes/note-1", "PUT", { ...note, version: 3 }, cookie)
    ).json();
    expect(restore.note.deleted).toBe(false);
    expect(restore.note.version).toBe(4);
  });

  test("rejects cross-site mutations and invalid input", async () => {
    const { request } = setup();
    const { cookie } = await register(request);
    expect(
      (
        await request("/api/notes/note-1", "PUT", note, cookie, {
          Origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          "/api/notes/note-1",
          "PUT",
          { ...note, version: -1 },
          cookie,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await request(
          "/api/notes/note-1",
          "PUT",
          { ...note, tags: [99] },
          cookie,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await request("/api/auth/register", "POST", {
          name: "N",
          email: "bad",
          password: "short",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request("/api/notes/note-1", "PUT", note, cookie, {
          Origin: "http://localhost:3000",
        })
      ).status,
    ).toBe(200);
  });

  test("keeps accounts, sessions, and notes across server restarts", async () => {
    const folder = mkdtempSync(join(tmpdir(), "bedrock-test-"));
    const path = join(folder, "vault.sqlite");
    let app = createApp(path);
    const request = (
      pathname: string,
      method = "GET",
      body?: unknown,
      cookie = "",
    ) =>
      app.handleRequest(
        new Request(`http://localhost:3000${pathname}`, {
          method,
          headers: { "Content-Type": "application/json", Cookie: cookie },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      );
    try {
      const { cookie } = await register(request);
      await request("/api/notes/durable", "PUT", note, cookie);
      app.close();
      app = createApp(path);
      const response = await request("/api/notes", "GET", undefined, cookie);
      expect(response.status).toBe(200);
      expect((await response.json()).notes[0].id).toBe("durable");
    } finally {
      app.close();
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
