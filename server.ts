import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

declare const ASSETS: Record<string, { data: string; type: string }>;

type User = { id: string; name: string; email: string };
type Note = {
  id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  icon: string;
  cover: string;
  starred: boolean;
  updatedAt: number;
  version: number;
  deleted: boolean;
};
type DbNote = Omit<Note, "tags" | "starred" | "deleted"> & {
  tags: string;
  starred: number;
  deleted: number;
};

const COOKIE = "bedrock_session";
const SESSION_MS = 1000 * 60 * 60 * 24 * 30;
const BODY_LIMIT = 600_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(data, {
    status,
    headers: { ...securityHeaders, "Cache-Control": "no-store", ...extra },
  });
}

function tokenHash(token: string) {
  return new Bun.CryptoHasher("sha256").update(token).digest("hex");
}

function cookieToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
}

function sessionCookie(request: Request, token: string, expire = false) {
  const secure =
    Bun.env.NODE_ENV === "production" ||
    new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expire ? 0 : SESSION_MS / 1000}${secure ? "; Secure" : ""}`;
}

function safeUser(row: any): User {
  return { id: row.id, name: row.name, email: row.email };
}

function publicNote(row: DbNote): Note {
  return {
    ...row,
    tags: JSON.parse(row.tags),
    starred: !!row.starred,
    deleted: !!row.deleted,
  };
}

async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new HttpError(415, "Send JSON with Content-Type: application/json.");
  }
  if (Number(request.headers.get("content-length")) > BODY_LIMIT) {
    throw new HttpError(413, "This request is too large.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > BODY_LIMIT) {
      await reader.cancel();
      throw new HttpError(413, "This request is too large.");
    }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Invalid object");
    }
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Send a valid JSON object.");
  }
}

function stringField(value: unknown, name: string, max: number, min = 0) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    throw new HttpError(
      400,
      `${name} must be between ${min} and ${max} characters.`,
    );
  }
  return value;
}

function validateNote(id: string, body: Record<string, unknown>) {
  if (!ID_PATTERN.test(id)) throw new HttpError(400, "Invalid note ID.");
  if (!Number.isSafeInteger(body.version) || Number(body.version) < 0) {
    throw new HttpError(400, "A valid note version is required.");
  }
  const title = stringField(body.title, "Title", 300);
  const content = stringField(body.content, "Note", 500_000);
  const folder = stringField(body.folder ?? "", "Folder", 100);
  const tags = body.tags ?? [];
  if (
    !Array.isArray(tags) ||
    tags.length > 50 ||
    tags.some(
      (tag) => typeof tag !== "string" || tag.length > 64 || !tag.length,
    )
  ) {
    throw new HttpError(400, "Use up to 50 tags of 1–64 characters.");
  }
  const icon = body.icon ?? "";
  const cover = body.cover ?? "";
  if (
    typeof icon !== "string" ||
    icon.length > 32 ||
    typeof cover !== "string" ||
    !/^[a-z0-9-]{0,40}$/.test(cover)
  ) {
    throw new HttpError(400, "Invalid page icon or cover.");
  }
  if (
    typeof body.starred !== "boolean" ||
    (body.deleted !== undefined && typeof body.deleted !== "boolean")
  ) {
    throw new HttpError(400, "Invalid note flags.");
  }
  return {
    id,
    title,
    content,
    folder,
    tags: [...new Set(tags)] as string[],
    icon,
    cover,
    starred: body.starred,
    deleted: body.deleted ?? false,
    version: Number(body.version),
  };
}

export function createApp(dbPath = Bun.env.DB_PATH ?? "/data/bedrock.sqlite") {
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath, { create: true, strict: true });
  db.exec(
    "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
  );
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS notes (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      id TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
      folder TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]',
      starred INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL,
      version INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, id)
    );
  `);
  // Page icons and covers arrived after the first release; add them to older databases.
  const noteColumns = db
    .query<{ name: string }, []>("PRAGMA table_info(notes)")
    .all()
    .map((column) => column.name);
  for (const column of ["icon", "cover"])
    if (!noteColumns.includes(column))
      db.exec(
        `ALTER TABLE notes ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`,
      );
  const selectNote = db.query<DbNote, [string, string]>(
    "SELECT id,title,content,folder,tags,icon,cover,starred,updated_at AS updatedAt,version,deleted FROM notes WHERE user_id = ? AND id = ?",
  );
  const rateLimits = new Map<string, { count: number; reset: number }>();
  let requests = 0;

  function rateLimit(request: Request, key: string, limit: number) {
    const ip =
      request.headers.get("x-railway-client-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "local";
    const bucketKey = `${key}:${ip}`;
    const now = Date.now();
    let bucket = rateLimits.get(bucketKey);
    if (!bucket || bucket.reset <= now) {
      bucket = { count: 0, reset: now + 15 * 60_000 };
      rateLimits.set(bucketKey, bucket);
    }
    bucket.count++;
    if (bucket.count > limit)
      throw new HttpError(
        429,
        "Too many attempts. Please try again in 15 minutes.",
      );
    if (++requests % 100 === 0) {
      for (const [key, value] of rateLimits)
        if (value.reset < now) rateLimits.delete(key);
      db.query("DELETE FROM sessions WHERE expires_at <= ?").run(now);
    }
  }

  function currentUser(request: Request): User | null {
    const token = cookieToken(request);
    if (!token || token.length > 100) return null;
    const row = db
      .query<
        any,
        [string, number]
      >("SELECT users.id,users.name,users.email FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?")
      .get(tokenHash(token), Date.now());
    return row ? safeUser(row) : null;
  }

  function openSession(user: User, request: Request) {
    const token = Buffer.from(
      crypto.getRandomValues(new Uint8Array(32)),
    ).toString("base64url");
    db.query(
      "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)",
    ).run(tokenHash(token), user.id, Date.now() + SESSION_MS);
    return json({ user }, 200, { "Set-Cookie": sessionCookie(request, token) });
  }

  function requireUser(request: Request) {
    const user = currentUser(request);
    if (!user) throw new HttpError(401, "Sign in to sync your vault.");
    return user;
  }

  async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
        const origin = request.headers.get("origin");
        if (request.headers.get("sec-fetch-site") === "cross-site") {
          throw new HttpError(403, "This request must come from Bedrock.");
        }
        if (origin) {
          let valid = false;
          try {
            valid = new URL(origin).host === url.host;
          } catch {}
          if (!valid)
            throw new HttpError(403, "This request must come from Bedrock.");
        }
      }

      if (path === "/api/health" && request.method === "GET") {
        db.query("SELECT 1").get();
        return json({ ok: true, service: "bedrock" });
      }
      if (path === "/api/auth/me" && request.method === "GET") {
        return json({ user: currentUser(request) });
      }
      if (path === "/api/auth/register" && request.method === "POST") {
        rateLimit(request, "register", 12);
        const body = await readJson(request);
        const name = stringField(body.name, "Name", 80, 1).trim();
        const email = stringField(body.email, "Email", 254, 3)
          .trim()
          .toLowerCase();
        const password = stringField(body.password, "Password", 128, 10);
        if (!name || !EMAIL_PATTERN.test(email))
          throw new HttpError(400, "Enter a name and valid email address.");
        if (db.query("SELECT id FROM users WHERE email=?").get(email)) {
          throw new HttpError(
            409,
            "An account with that email already exists. Try signing in.",
          );
        }
        const passwordHash = await Bun.password.hash(password, {
          algorithm: "argon2id",
          memoryCost: 19456,
          timeCost: 2,
        });
        const user = { id: crypto.randomUUID(), name, email };
        try {
          db.query(
            "INSERT INTO users(id,name,email,password_hash,created_at) VALUES (?,?,?,?,?)",
          ).run(user.id, user.name, user.email, passwordHash, Date.now());
        } catch (error: any) {
          if (error.code?.includes("CONSTRAINT"))
            throw new HttpError(
              409,
              "An account with that email already exists. Try signing in.",
            );
          throw error;
        }
        return openSession(user, request);
      }
      if (path === "/api/auth/login" && request.method === "POST") {
        rateLimit(request, "login", 30);
        const body = await readJson(request);
        const email = stringField(body.email, "Email", 254, 3)
          .trim()
          .toLowerCase();
        const password = stringField(body.password, "Password", 128, 1);
        const row = db
          .query<
            any,
            [string]
          >("SELECT id,name,email,password_hash FROM users WHERE email=?")
          .get(email);
        if (!row || !(await Bun.password.verify(password, row.password_hash))) {
          throw new HttpError(401, "That email and password do not match.");
        }
        return openSession(safeUser(row), request);
      }
      if (path === "/api/auth/logout" && request.method === "POST") {
        const token = cookieToken(request);
        if (token)
          db.query("DELETE FROM sessions WHERE token_hash=?").run(
            tokenHash(token),
          );
        return json({ ok: true }, 200, {
          "Set-Cookie": sessionCookie(request, "", true),
        });
      }

      if (path === "/api/notes" && request.method === "GET") {
        const user = requireUser(request);
        const rows = db
          .query<
            DbNote,
            [string]
          >("SELECT id,title,content,folder,tags,icon,cover,starred,updated_at AS updatedAt,version,deleted FROM notes WHERE user_id=? ORDER BY updated_at DESC")
          .all(user.id);
        return json({ notes: rows.map(publicNote) });
      }
      const noteMatch = /^\/api\/notes\/([A-Za-z0-9_-]{1,100})$/.exec(path);
      if (
        noteMatch &&
        (request.method === "PUT" || request.method === "DELETE")
      ) {
        const user = requireUser(request);
        const id = noteMatch[1];
        const body = await readJson(request);
        if (!Number.isSafeInteger(body.version) || Number(body.version) < 0) {
          throw new HttpError(400, "A valid note version is required.");
        }
        const validated =
          request.method === "PUT" ? validateNote(id, body) : null;
        const result = db.transaction(() => {
          const existing = selectNote.get(user.id, id);
          if (existing && existing.version !== body.version) {
            return { conflict: publicNote(existing) };
          }
          if (!existing && body.version !== 0) return { conflict: null };
          if (request.method === "DELETE") {
            if (!existing)
              throw new HttpError(404, "This note no longer exists.");
            db.query(
              "UPDATE notes SET deleted=1,version=version+1,updated_at=? WHERE user_id=? AND id=?",
            ).run(Date.now(), user.id, id);
          } else if (validated) {
            if (!existing) {
              const count = db
                .query<
                  { count: number },
                  [string]
                >("SELECT count(*) AS count FROM notes WHERE user_id=?")
                .get(user.id)!;
              if (count.count >= 10000)
                throw new HttpError(
                  400,
                  "Your vault has reached the 10,000 note limit.",
                );
            }
            db.query(
              `INSERT INTO notes(user_id,id,title,content,folder,tags,icon,cover,starred,updated_at,version,deleted)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(user_id,id) DO UPDATE SET title=excluded.title,content=excluded.content,
              folder=excluded.folder,tags=excluded.tags,icon=excluded.icon,cover=excluded.cover,starred=excluded.starred,
              updated_at=excluded.updated_at,version=excluded.version,deleted=excluded.deleted`,
            ).run(
              user.id,
              id,
              validated.title,
              validated.content,
              validated.folder,
              JSON.stringify(validated.tags),
              validated.icon,
              validated.cover,
              Number(validated.starred),
              Date.now(),
              (existing?.version ?? 0) + 1,
              Number(validated.deleted),
            );
          }
          return { note: publicNote(selectNote.get(user.id, id)!) };
        })();
        if ("conflict" in result) {
          return json(
            {
              error: "This note changed on another device.",
              note: result.conflict,
            },
            409,
          );
        }
        return json(result);
      }
      if (path.startsWith("/api/"))
        return json({ error: "Endpoint not found." }, 404);
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ error: "Method not allowed." }, 405, {
          Allow: "GET, HEAD",
        });
      }
      if (typeof ASSETS !== "undefined") {
        const asset =
          ASSETS[path] ??
          (!path.split("/").at(-1)?.includes(".")
            ? ASSETS["/index.html"]
            : undefined);
        if (!asset) return new Response("Not found", { status: 404 });
        return new Response(
          request.method === "HEAD" ? null : Buffer.from(asset.data, "base64"),
          {
            headers: {
              ...securityHeaders,
              "Content-Type": asset.type,
              "Cache-Control": path.startsWith("/assets/")
                ? "public, max-age=31536000, immutable"
                : "no-cache",
            },
          },
        );
      }
      const dist = resolve(import.meta.dir, "dist");
      const filePath = resolve(dist, `.${decodeURIComponent(path)}`);
      if (filePath !== dist && !filePath.startsWith(dist + sep))
        return new Response("Not found", { status: 404 });
      let file = Bun.file(filePath);
      if (!(await file.exists()) || path === "/") {
        if (path.split("/").at(-1)?.includes("."))
          return new Response("Not found", { status: 404 });
        file = Bun.file(resolve(dist, "index.html"));
      }
      if (!(await file.exists()))
        return new Response("Bedrock is building.", { status: 503 });
      return new Response(request.method === "HEAD" ? null : file, {
        headers: {
          ...securityHeaders,
          "Content-Type": file.type,
          "Cache-Control": "no-cache",
        },
      });
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      console.error(
        "Request failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  }
  return { handleRequest, close: () => db.close() };
}

if (import.meta.main) {
  const app = createApp();
  const server = Bun.serve({
    port: Number(Bun.env.PORT ?? 3000),
    hostname: "0.0.0.0",
    maxRequestBodySize: BODY_LIMIT,
    fetch: app.handleRequest,
  });
  console.log(`Bedrock listening on ${server.port}`);
}
