import { useCallback, useEffect, useRef, useState } from "react";
import type { Note, User } from "./types";

type SyncStatus = "local" | "syncing" | "synced" | "offline" | "error";
type Cache = { notes: Note[]; pending: string[] };
type ApiError = Error & { status?: number; note?: Note };
const GUEST_KEY = "bedrock:v1:guest";
const SESSION_KEY = "bedrock:v1:session";
const accountKey = (id: string) => `bedrock:v1:account:${id}`;
const newId = () => crypto.randomUUID();
const online = () => typeof navigator === "undefined" || navigator.onLine;

function validNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  const n = value as Note;
  return (
    typeof n.id === "string" &&
    typeof n.title === "string" &&
    typeof n.content === "string" &&
    typeof n.folder === "string" &&
    Array.isArray(n.tags) &&
    n.tags.every((t) => typeof t === "string") &&
    typeof n.starred === "boolean" &&
    typeof n.deleted === "boolean" &&
    typeof n.updatedAt === "number" &&
    typeof n.version === "number"
  );
}
function readCache(key: string, fallback: Note[] = []): Cache {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { notes: fallback.map((n) => ({ ...n })), pending: [] };
    const value = JSON.parse(raw);
    if (Array.isArray(value?.notes) && value.notes.every(validNote)) {
      return {
        notes: value.notes,
        pending: Array.isArray(value.pending)
          ? value.pending.filter((id: unknown) => typeof id === "string")
          : [],
      };
    }
  } catch {
    /* A damaged cache must not stop the editor opening. */
  }
  return { notes: fallback.map((n) => ({ ...n })), pending: [] };
}
function readRememberedUser(): User | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (
      value &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      typeof value.email === "string"
    )
      return value;
  } catch {
    /* An inaccessible cache falls back to the guest vault. */
  }
  return null;
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    signal: AbortSignal.timeout(20000),
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.error || `Request failed (${response.status}).`,
    ) as ApiError;
    error.status = response.status;
    error.note = data.note;
    throw error;
  }
  return data as T;
}

/** A local-first vault. Pending edits survive reloads and are isolated by account. */
export function useVault(seed: Note[]) {
  const seedRef = useRef(seed);
  const [notes, setNotes] = useState<Note[]>(
    () => readCache(GUEST_KEY, seed).notes,
  );
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [error, setError] = useState("");
  const notesRef = useRef(notes);
  const userRef = useRef<User | null>(null);
  const pending = useRef(new Map<string, number>());
  const sequence = useRef(0);
  const generation = useRef(0);
  const alive = useRef(true);
  const syncing = useRef<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncRef = useRef<() => Promise<void>>(async () => {});

  const persist = useCallback(() => {
    try {
      localStorage.setItem(
        userRef.current ? accountKey(userRef.current.id) : GUEST_KEY,
        JSON.stringify({
          notes: notesRef.current,
          pending: [...pending.current.keys()],
        }),
      );
      return true;
    } catch {
      setError(
        "This browser is out of storage. Export your notes to keep a backup.",
      );
      setSyncStatus("error");
      return false;
    }
  }, []);

  const replaceNotes = useCallback(
    (next: Note[]) => {
      notesRef.current = next;
      setNotes(next);
      return persist();
    },
    [persist],
  );

  const activate = useCallback(
    (nextUser: User | null, initial?: Cache) => {
      generation.current += 1;
      if (debounce.current) clearTimeout(debounce.current);
      syncing.current = null;
      userRef.current = nextUser;
      setUser(nextUser);
      try {
        if (nextUser)
          localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
        else localStorage.removeItem(SESSION_KEY);
      } catch {
        /* The in-memory session remains usable if browser storage is full. */
      }
      const cache =
        initial ||
        readCache(
          nextUser ? accountKey(nextUser.id) : GUEST_KEY,
          nextUser ? [] : seedRef.current,
        );
      pending.current = new Map(
        cache.pending.map((id) => [id, ++sequence.current]),
      );
      notesRef.current = cache.notes;
      setNotes(cache.notes);
      setError("");
      setSyncStatus(nextUser ? (online() ? "syncing" : "offline") : "local");
      persist();
    },
    [persist],
  );

  const sync = useCallback(async () => {
    const currentUser = userRef.current;
    const session = generation.current;
    if (!currentUser || !alive.current || syncing.current === session) return;
    if (!online()) {
      setSyncStatus("offline");
      return;
    }
    syncing.current = session;
    const current = () => alive.current && generation.current === session;
    if (pending.current.size) setSyncStatus("syncing");
    try {
      const remote = await api<{ notes: Note[] }>("/api/notes");
      if (!current()) return;
      if (!Array.isArray(remote.notes) || !remote.notes.every(validNote))
        throw new Error(
          "The server returned an invalid vault. Your local notes are safe.",
        );
      // Dirty records keep their original base version until a PUT verifies it.
      const merged = new Map(notesRef.current.map((note) => [note.id, note]));
      for (const note of remote.notes) {
        if (!pending.current.has(note.id)) merged.set(note.id, note);
      }
      replaceNotes([...merged.values()]);
      // Take a fresh snapshot each iteration so changes made during a request remain queued.
      // The bound prevents a continuously edited note starving normal polling.
      for (let count = 0; count < 100 && pending.current.size; count += 1) {
        if (!current()) return;
        const [id, revision] = pending.current.entries().next().value as [
          string,
          number,
        ];
        const note = notesRef.current.find((n) => n.id === id);
        if (!note) {
          pending.current.delete(id);
          continue;
        }
        try {
          const result = await api<{ note: Note }>(
            `/api/notes/${encodeURIComponent(id)}`,
            { method: "PUT", body: JSON.stringify(note) },
          );
          if (!current()) return;
          if (!validNote(result.note))
            throw new Error(
              "The server did not confirm this edit. Your local copy is safe.",
            );
          if (pending.current.get(id) === revision) {
            pending.current.delete(id);
            replaceNotes(
              notesRef.current.map((n) => (n.id === id ? result.note : n)),
            );
          } else {
            // A later edit uses the newly acknowledged version without losing its text.
            replaceNotes(
              notesRef.current.map((n) =>
                n.id === id ? { ...n, version: result.note.version } : n,
              ),
            );
          }
        } catch (cause) {
          if (!current()) return;
          const err = cause as ApiError;
          if (err.status === 409 && validNote(err.note)) {
            const latest = notesRef.current.find((n) => n.id === id) || note;
            const copy: Note = {
              ...latest,
              id: newId(),
              title: `${latest.title || "Untitled"} (conflict copy)`,
              version: 0,
              updatedAt: Date.now(),
              deleted: false,
            };
            pending.current.delete(id);
            pending.current.set(copy.id, ++sequence.current);
            replaceNotes([
              ...notesRef.current.map((n) => (n.id === id ? err.note! : n)),
              copy,
            ]);
            setError(
              "This note changed on another device. Both versions were kept; look for “conflict copy”.",
            );
          } else throw err;
        }
      }
      if (!current()) return;
      if (!persist()) return;
      setError((previous) =>
        previous.includes("conflict copy") ? previous : "",
      );
      setSyncStatus(pending.current.size ? "syncing" : "synced");
      if (pending.current.size)
        debounce.current = setTimeout(() => void syncRef.current(), 700);
    } catch (cause) {
      if (!current()) return;
      const err = cause as ApiError;
      if (err.status === 401) {
        // Persist pending account data before returning to the separate guest vault.
        persist();
        activate(null);
        setError(
          "Your session expired. Sign in again to resume syncing your saved account notes.",
        );
        setSyncStatus("error");
      } else {
        setSyncStatus(!online() || !err.status ? "offline" : "error");
        setError(
          !err.status
            ? "Connection unavailable. Changes are saved on this device and will sync when you reconnect."
            : err.message,
        );
      }
    } finally {
      if (syncing.current === session) syncing.current = null;
    }
  }, [activate, persist, replaceNotes]);
  syncRef.current = sync;

  const schedule = useCallback(() => {
    if (!userRef.current) return;
    setSyncStatus(online() ? "syncing" : "offline");
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void syncRef.current(), 700);
  }, []);

  const saveNote = useCallback(
    (note: Note) => {
      const existing = notesRef.current.find((n) => n.id === note.id);
      // UI snapshots can be stale after a successful upload; the current cache owns the base version.
      const next = {
        ...note,
        version: existing?.version ?? 0,
        updatedAt: Date.now(),
      };
      if (userRef.current) pending.current.set(note.id, ++sequence.current);
      const stored = replaceNotes(
        existing
          ? notesRef.current.map((n) => (n.id === note.id ? next : n))
          : [...notesRef.current, next],
      );
      if (stored) {
        if (userRef.current) schedule();
        else setSyncStatus("local");
      }
    },
    [replaceNotes, schedule],
  );

  const deleteNote = useCallback(
    (id: string) => {
      const note = notesRef.current.find((n) => n.id === id);
      if (note) saveNote({ ...note, deleted: true });
    },
    [saveNote],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setError("");
      const result = await api<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      const imported = notesRef.current
        .filter((n) => !n.deleted)
        .map((n) => ({ ...n, version: 0 }));
      activate(result.user, {
        notes: imported,
        pending: imported.map((n) => n.id),
      });
      await syncRef.current();
    },
    [activate],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setError("");
      const result = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      activate(result.user);
      await syncRef.current();
    },
    [activate],
  );

  const logout = useCallback(async () => {
    // A rejected logout keeps the signed-in state truthful instead of leaving a live cookie behind.
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    persist();
    activate(null);
  }, [activate, persist]);

  const retrySync = useCallback(() => {
    setError("");
    void syncRef.current();
  }, []);

  useEffect(() => {
    alive.current = true;
    const initialGeneration = generation.current;
    void api<{ user: User | null }>("/api/auth/me")
      .then((result) => {
        if (!alive.current || initialGeneration !== generation.current) return;
        if (result.user) {
          activate(result.user);
          void syncRef.current();
        } else activate(null);
      })
      .catch(() => {
        if (!alive.current || initialGeneration !== generation.current) return;
        // An offline reload can reopen the previously signed-in account's local vault.
        // Logout/session expiry removes this marker, and the server still authorizes every upload.
        const remembered = readRememberedUser();
        if (remembered) {
          activate(remembered);
          setSyncStatus("offline");
          setError(
            "Connection unavailable. Changes are saved on this device and will sync when you reconnect.",
          );
        }
      })
      .finally(() => {
        if (alive.current) setReady(true);
      });
    const poll = setInterval(() => void syncRef.current(), 5000);
    const reconnect = () => {
      if (userRef.current) {
        setError("");
        void syncRef.current();
      }
    };
    const disconnect = () => {
      if (userRef.current) setSyncStatus("offline");
    };
    const focus = () => {
      if (document.visibilityState === "visible") void syncRef.current();
    };
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", disconnect);
    document.addEventListener("visibilitychange", focus);
    return () => {
      alive.current = false;
      generation.current += 1;
      syncing.current = null;
      clearInterval(poll);
      if (debounce.current) clearTimeout(debounce.current);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", disconnect);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [activate]);

  return {
    notes,
    user,
    ready,
    syncStatus,
    error,
    saveNote,
    deleteNote,
    register,
    login,
    logout,
    retrySync,
  };
}
