import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cloud,
  Command,
  Copy,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Hash,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  Maximize2,
  Menu,
  Moon,
  MoreHorizontal,
  Network,
  PanelLeft,
  PanelRight,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Upload,
  X,
  CalendarDays,
  LogOut,
  Bold,
  Italic,
  Heading2,
  ListTodo,
  Code,
  WifiOff,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Note } from "./types";
import { seed } from "./seed";
import { useVault } from "./useVault";
import Graph from "./Graph";

function Rock({ small = false }: { small?: boolean }) {
  return (
    <svg
      width={small ? 24 : 31}
      height={small ? 28 : 35}
      viewBox="0 0 34 38"
      fill="none"
      aria-hidden="true"
    >
      <path d="m5 27 7-22 13 3 6 21-14 6Z" fill="currentColor" />
      <path
        d="m12 5 5 30L25 8M5 27 25 8"
        stroke="var(--logo-line)"
        strokeWidth="1.4"
      />
    </svg>
  );
}
function IconButton({
  children,
  label,
  onClick,
  active = false,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      className={"icon-button " + (active ? "active" : "")}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.querySelector<HTMLElement>("input,button,textarea")?.focus();
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusables = Array.from(
          el?.querySelectorAll<HTMLElement>(
            "button,input,textarea,select,a[href]",
          ) || [],
        ).filter((x) => !x.hasAttribute("disabled"));
        const first = focusables[0],
          last = focusables.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", fn);
    return () => {
      document.removeEventListener("keydown", fn);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"modal " + (wide ? "wide" : "")}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
const folders = [
  "Start here",
  "Ideas",
  "Projects",
  "Personal",
  "Resources",
  "Daily notes",
];
const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});
function download(name: string, content: string, type = "text/markdown") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function App() {
  const vault = useVault(seed);
  const { notes, user, saveNote, syncStatus } = vault;
  const [activeId, setActiveId] = useState("welcome");
  const [tabs, setTabs] = useState<string[]>(["welcome", "noticing"]);
  const [view, setView] = useState("note");
  const [filter, setFilter] = useState("All notes");
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([
    "Projects",
    "Personal",
    "Resources",
    "Daily notes",
  ]);
  const [sidebar, setSidebar] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [rightPanel, setRightPanel] = useState(true);
  const [focus, setFocus] = useState(false);
  const [modal, setModal] = useState<
    "search" | "auth" | "settings" | "new" | "help" | null
  >(null);
  const [query, setQuery] = useState("");
  const [authMode, setAuthMode] = useState("register");
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newFolder, setNewFolder] = useState("Ideas");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bedrock-theme") || "light",
  );
  const [newTag, setNewTag] = useState("");
  const [zoom, setZoom] = useState(1);
  const titleInput = useRef<HTMLTextAreaElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null),
    importer = useRef<HTMLInputElement>(null),
    article = useRef<HTMLElement>(null);
  const live = notes.filter((n) => !n.deleted);
  const note = live.find((n) => n.id === activeId) || live[0];
  useLayoutEffect(() => {
    const resize = () => {
      const el = titleInput.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }
    };
    resize();
    document.fonts.ready.then(resize);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [note?.title, view]);
  const openNote = (id: string) => {
    setActiveId(id);
    setView("note");
    setEditing(false);
    setTabs((t) => (t.includes(id) ? t : [...t, id]));
    setSidebar(false);
    setModal(null);
    setQuery("");
  };
  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 3500);
  };
  const update = (patch: Partial<Note>) =>
    note && saveNote({ ...note, ...patch, updatedAt: Date.now() });
  const create = (title = "Untitled note", folder = "Ideas", content = "") => {
    const n: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      folder,
      tags: [],
      starred: false,
      updatedAt: Date.now(),
      version: 0,
      deleted: false,
    };
    saveNote(n);
    openNote(n.id);
    setEditing(true);
    return n;
  };
  const daily = () => {
    const title = new Intl.DateTimeFormat("en", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date());
    const existing = live.find(
      (n) => n.folder === "Daily notes" && n.title === title,
    );
    if (existing) openNote(existing.id);
    else
      create(
        title,
        "Daily notes",
        "## On my mind\n\n\n\n## A little gratitude\n\n\n\n## One thing for today\n\n- [ ] ",
      );
  };
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("bedrock-theme", theme);
  }, [theme]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setModal((m) => (m === "search" ? null : "search"));
        setQuery("");
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setModal("new");
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setEditing((v) => !v);
      }
      if (e.key === "Escape") {
        setMenu(false);
        setSidebar(false);
        setFocus(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const links = note
    ? [...note.content.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((m) => m[1])
    : [];
  const backlinks = note
    ? live.filter(
        (n) =>
          n.id !== note.id &&
          n.content.toLowerCase().includes(`[[${note.title.toLowerCase()}]]`),
      )
    : [];
  const headings = note
    ? [...note.content.matchAll(/^#{1,3} (.+)$/gm)].map((m) => m[1])
    : [];
  const results = useMemo(
    () =>
      live
        .filter((n) =>
          (n.title + " " + n.content + " " + n.tags.join(" "))
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 14),
    [notes, query],
  );
  const listed =
    filter === "Trash"
      ? notes.filter((n) => n.deleted)
      : live.filter(
          (n) =>
            filter === "All notes" ||
            (filter === "Starred"
              ? n.starred
              : filter.startsWith("#")
                ? n.tags.includes(filter.slice(1))
                : n.folder === filter),
        );
  const inlineLink = (title: string) => {
    const n = live.find((x) => x.title.toLowerCase() === title.toLowerCase());
    if (n) openNote(n.id);
    else create(title);
  };
  const markdown =
    note?.content.replace(
      /\[\[([^\]\n]+)\]\]/g,
      (_, title) => `[${title}](#note-${encodeURIComponent(title)})`,
    ) || "";
  const format = (before: string, after = "") => {
    const el = editor.current;
    if (!el) return;
    const start = el.selectionStart,
      end = el.selectionEnd;
    const selected = note.content.slice(start, end);
    update({
      content:
        note.content.slice(0, start) +
        before +
        selected +
        after +
        note.content.slice(end),
    });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  };
  const syncLabel =
    syncStatus === "synced"
      ? "All changes synced"
      : syncStatus === "syncing"
        ? "Syncing changes…"
        : syncStatus === "offline"
          ? "Offline · saved on device"
          : syncStatus === "error"
            ? "Sync needs attention"
            : "Saved on this device";
  const syncIcon =
    syncStatus === "syncing" ? (
      <Loader2 size={14} className="spin" />
    ) : syncStatus === "offline" ? (
      <WifiOff size={14} />
    ) : syncStatus === "synced" ? (
      <Cloud size={15} />
    ) : (
      <Check size={14} />
    );
  const exportNote = () => {
    if (note)
      download(
        note.title.replace(/[/\\]/g, "-") + ".md",
        `# ${note.title}\n\n${note.content}`,
      );
    setMenu(false);
  };
  const importFiles = async (files: FileList | null) => {
    if (!files) return;
    let count = 0;
    for (const file of Array.from(files)) {
      if (file.size > 500000) {
        notify("Please keep each note under 500 KB");
        continue;
      }
      const content = await file.text();
      const heading = content.match(/^# (.+)\n/);
      const n: Note = {
        id: crypto.randomUUID(),
        title: heading?.[1] || file.name.replace(/\.md$/, ""),
        content: heading ? content.replace(/^# .+\n\n?/, "") : content,
        folder: "Resources",
        tags: [],
        starred: false,
        updatedAt: Date.now(),
        version: 0,
        deleted: false,
      };
      saveNote(n);
      count++;
    }
    notify(`Imported ${count} ${count === 1 ? "note" : "notes"}`);
    setModal(null);
  };
  return (
    <div
      className={
        "app " +
        (focus ? "focus-mode " : "") +
        (sidebarHidden ? "sidebar-hidden" : "")
      }
    >
      {sidebar && (
        <div className="mobile-scrim" onClick={() => setSidebar(false)} />
      )}
      <aside className={"sidebar " + (sidebar ? "mobile-open" : "")}>
        <div className="brand">
          <span className="brand-rock">
            <Rock />
          </span>
          <span>
            bedrock<span className="brand-dot">.</span>
          </span>
          <span className="beta">BETA</span>
        </div>
        <button className="vault-switch" onClick={() => setModal("settings")}>
          <span className="vault-avatar">
            {user?.name?.slice(0, 1).toUpperCase() || "P"}
          </span>
          <span>
            <strong>
              {user ? `${user.name.split(" ")[0]}’s vault` : "Personal vault"}
            </strong>
            <small>Your space to think</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <button
          className="search-trigger"
          onClick={() => {
            setModal("search");
            setQuery("");
          }}
        >
          <Search size={16} />
          <span>Find anything</span>
          <kbd>⌘ K</kbd>
        </button>
        <nav className="main-nav">
          <button
            className={
              view === "collection" && filter === "All notes" ? "selected" : ""
            }
            onClick={() => {
              setView("collection");
              setFilter("All notes");
              setSidebar(false);
            }}
          >
            <LayoutGrid size={17} />
            <span>All notes</span>
            <small>{live.length}</small>
          </button>
          <button onClick={daily}>
            <CalendarDays size={17} />
            <span>Daily note</span>
            <span className="tiny-sun" aria-hidden="true">
              ☀
            </span>
          </button>
          <button
            className={view === "graph" ? "selected" : ""}
            onClick={() => {
              setView("graph");
              setSidebar(false);
            }}
          >
            <Network size={17} />
            <span>Graph view</span>
          </button>
        </nav>
        <div className="sidebar-scroll">
          <div className="section-label">
            <span>STARRED</span>
            <Star size={12} />
          </div>
          <div className="starred-list">
            {live
              .filter((n) => n.starred)
              .map((n) => (
                <button
                  key={n.id}
                  className="sidebar-note"
                  onClick={() => openNote(n.id)}
                >
                  <FileText size={15} />
                  <span>{n.title}</span>
                </button>
              ))}
          </div>
          <div className="section-label notes-label">
            <span>YOUR VAULT</span>
            <div>
              <IconButton
                label="Import Markdown files"
                onClick={() => importer.current?.click()}
              >
                <Upload size={13} />
              </IconButton>
              <IconButton
                label="New note"
                onClick={() => {
                  setNewTitle("");
                  setModal("new");
                }}
              >
                <Plus size={16} />
              </IconButton>
            </div>
          </div>
          {[...new Set([...folders, ...live.map((n) => n.folder)])].map(
            (folder) => {
              const items = live.filter((n) => n.folder === folder);
              if (!items.length && folder === "Daily notes") return null;
              const isCollapsed = collapsed.includes(folder);
              return (
                <div key={folder} className="folder-group">
                  <button
                    className="folder-row"
                    onClick={() =>
                      setCollapsed((c) =>
                        c.includes(folder)
                          ? c.filter((f) => f !== folder)
                          : [...c, folder],
                      )
                    }
                  >
                    {isCollapsed ? (
                      <ChevronRight size={13} />
                    ) : (
                      <ChevronDown size={13} />
                    )}
                    <span
                      className={
                        "folder-icon " + (folder === "Start here" ? "sage" : "")
                      }
                    >
                      {isCollapsed ? (
                        <Folder size={16} />
                      ) : (
                        <FolderOpen size={16} />
                      )}
                    </span>
                    <span>{folder}</span>
                    <small>{items.length}</small>
                  </button>
                  {!isCollapsed && (
                    <div className="folder-children">
                      {items.map((n) => (
                        <button
                          className={
                            "tree-note " +
                            (note?.id === n.id && view === "note"
                              ? "current"
                              : "")
                          }
                          key={n.id}
                          onClick={() => openNote(n.id)}
                        >
                          <FileText size={14} />
                          <span>{n.title}</span>
                          {note?.id === n.id && view === "note" && (
                            <span className="active-dot" />
                          )}
                        </button>
                      ))}
                      {!items.length && (
                        <button
                          className="empty-folder"
                          onClick={() => {
                            setNewFolder(folder);
                            setModal("new");
                          }}
                        >
                          + Add a note
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            },
          )}
          <button
            className="new-note-sidebar"
            onClick={() => {
              setNewTitle("");
              setModal("new");
            }}
          >
            <Plus size={16} /> New note <kbd>⌘ N</kbd>
          </button>
        </div>
        <div className="sidebar-bottom">
          {!user && (
            <button
              className="sync-card"
              onClick={() => {
                setModal("auth");
                setAuthError("");
              }}
            >
              <span className="sync-card-icon">
                <Cloud size={19} />
              </span>
              <span>
                <strong>A home on every device</strong>
                <small>
                  Turn on Bedrock sync <ArrowUpRight size={11} />
                </small>
              </span>
            </button>
          )}
          <div className="sidebar-footer">
            <button
              className="user-button"
              onClick={() => setModal(user ? "settings" : "auth")}
            >
              <span className="user-avatar">
                {user?.name?.slice(0, 1).toUpperCase() || "Y"}
              </span>
              <span>{user?.name || "Your workspace"}</span>
            </button>
            <IconButton label="Settings" onClick={() => setModal("settings")}>
              <Settings2 size={17} />
            </IconButton>
          </div>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <IconButton
              label="Toggle sidebar"
              onClick={() => {
                if (window.innerWidth <= 700) setSidebar(!sidebar);
                else setSidebarHidden((v) => !v);
                if (focus) setFocus(false);
              }}
            >
              <PanelLeft size={17} />
            </IconButton>
            <span className="breadcrumb-vault">
              {user ? `${user.name.split(" ")[0]}’s vault` : "Personal vault"}
            </span>
            <ChevronRight size={12} />
            <span>
              {view === "graph"
                ? "Graph view"
                : view === "collection"
                  ? filter
                  : note?.folder || "Notes"}
            </span>
          </div>
          <div className="top-actions">
            <button
              className={
                "sync-status " + (syncStatus === "error" ? "error" : "")
              }
              onClick={() => {
                if (!user) setModal("auth");
                else vault.retrySync();
              }}
              title={vault.error || syncLabel}
            >
              {syncIcon}
              <span>{syncLabel}</span>
            </button>
            <span className="top-divider" />
            <IconButton
              label="Toggle details panel"
              active={!rightPanel}
              onClick={() => setRightPanel(!rightPanel)}
            >
              <PanelRight size={17} />
            </IconButton>
          </div>
        </header>
        <div className="tabs-row">
          <div className="tabs">
            {tabs.map((id) => {
              const n = live.find((x) => x.id === id);
              return (
                n && (
                  <div
                    key={id}
                    className={
                      "note-tab " +
                      (view === "note" && note?.id === id ? "active" : "")
                    }
                  >
                    <button onClick={() => openNote(id)}>
                      <FileText size={14} />
                      <span>{n.title}</span>
                    </button>
                    <button
                      className="tab-close"
                      aria-label={"Close " + n.title}
                      onClick={() => {
                        setTabs((t) => t.filter((x) => x !== id));
                        if (id === activeId) {
                          const other = tabs.find((x) => x !== id);
                          if (other) setActiveId(other);
                          else setView("collection");
                        }
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )
              );
            })}
            <IconButton
              label="Create note"
              onClick={() => {
                setNewTitle("");
                setModal("new");
              }}
            >
              <Plus size={16} />
            </IconButton>
          </div>
          <div className="tab-tools">
            <span className="quiet-label">A little space for big ideas.</span>
          </div>
        </div>
        <div className="workspace">
          {view === "note" && note ? (
            <>
              <section className="document-pane">
                <div className="document-toolbar">
                  <div className="doc-location">
                    <span className="doc-badge">
                      <FileText size={12} />
                    </span>
                    <span>{note.folder}</span>
                    <ChevronRight size={12} />
                    <span className="doc-title-small">{note.title}</span>
                  </div>
                  <div className="document-actions">
                    <button
                      className={"mode-toggle " + (editing ? "editing" : "")}
                      onClick={() => setEditing(!editing)}
                    >
                      {editing ? <BookOpen size={14} /> : <Pencil size={14} />}
                      <span>{editing ? "Read" : "Edit"}</span>
                    </button>
                    <IconButton
                      label={note.starred ? "Unstar note" : "Star note"}
                      active={note.starred}
                      onClick={() => update({ starred: !note.starred })}
                    >
                      <Star
                        size={16}
                        fill={note.starred ? "currentColor" : "none"}
                      />
                    </IconButton>
                    <IconButton
                      label="Focus mode"
                      onClick={() => setFocus(!focus)}
                    >
                      <Maximize2 size={16} />
                    </IconButton>
                    <div className="menu-anchor">
                      <IconButton
                        label="Note options"
                        onClick={() => setMenu(!menu)}
                      >
                        <MoreHorizontal size={19} />
                      </IconButton>
                      {menu && (
                        <>
                          <div
                            className="menu-scrim"
                            onClick={() => setMenu(false)}
                          />
                          <div className="dropdown">
                            <button onClick={exportNote}>
                              <ArrowDownToLine size={15} />
                              Export Markdown
                            </button>
                            <button
                              onClick={() => {
                                create(
                                  note.title + " (copy)",
                                  note.folder,
                                  note.content,
                                );
                                setMenu(false);
                              }}
                            >
                              <Copy size={15} />
                              Duplicate note
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard
                                  ?.writeText(note.content)
                                  .then(() => notify("Note copied"));
                                setMenu(false);
                              }}
                            >
                              <Copy size={15} />
                              Copy Markdown
                            </button>
                            <button
                              className="danger"
                              onClick={() => {
                                vault.deleteNote(note.id);
                                setMenu(false);
                                notify("Moved to trash");
                              }}
                            >
                              <Trash2 size={15} />
                              Move to trash
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <article ref={article} className="document-scroll">
                  <div className="document-content">
                    <div className="document-eyebrow">
                      <span className="sprout-icon">
                        <Sparkles size={20} strokeWidth={1.5} />
                      </span>
                      <span>
                        {note.id === "welcome"
                          ? "A FRESH BEGINNING"
                          : note.folder.toUpperCase()}
                      </span>
                    </div>
                    <textarea
                      ref={titleInput}
                      className="note-title"
                      aria-label="Note title"
                      maxLength={300}
                      value={note.title}
                      rows={1}
                      onChange={(e) => update({ title: e.target.value })}
                      onBlur={() => {
                        if (!note.title.trim())
                          update({ title: "Untitled note" });
                      }}
                    />
                    <div className="note-meta">
                      <span>
                        <CalendarDays size={13} />{" "}
                        {dateFormat.format(note.updatedAt)}
                      </span>
                      <span className="metadata-dot">·</span>
                      <span>
                        {Math.max(
                          1,
                          Math.ceil(note.content.split(/\s+/).length / 200),
                        )}{" "}
                        min read
                      </span>
                      <span className="metadata-dot">·</span>
                      <span>{note.folder}</span>
                    </div>
                    <div className="note-tags">
                      {note.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setFilter("#" + tag);
                            setView("collection");
                          }}
                        >
                          <Hash size={11} />
                          {tag}
                        </button>
                      ))}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const t = newTag.trim().replace(/^#/, "");
                          if (t && !note.tags.includes(t))
                            update({ tags: [...note.tags, t] });
                          setNewTag("");
                        }}
                      >
                        <Plus size={12} />
                        <input
                          aria-label="Add tag"
                          maxLength={64}
                          placeholder="Add tag"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                        />
                      </form>
                    </div>
                    <div className="note-divider" />
                    {editing ? (
                      <div className="markdown-editor">
                        <div className="format-toolbar">
                          <IconButton
                            label="Bold"
                            onClick={() => format("**", "**")}
                          >
                            <Bold size={15} />
                          </IconButton>
                          <IconButton
                            label="Italic"
                            onClick={() => format("*", "*")}
                          >
                            <Italic size={15} />
                          </IconButton>
                          <IconButton
                            label="Heading"
                            onClick={() => format("\n## ")}
                          >
                            <Heading2 size={17} />
                          </IconButton>
                          <span />
                          <IconButton
                            label="Insert note link"
                            onClick={() => format("[[", "]]")}
                          >
                            <Link2 size={16} />
                          </IconButton>
                          <IconButton
                            label="Checklist"
                            onClick={() => format("\n- [ ] ")}
                          >
                            <ListTodo size={17} />
                          </IconButton>
                          <IconButton
                            label="Code"
                            onClick={() => format("`", "`")}
                          >
                            <Code size={16} />
                          </IconButton>
                          <small>Markdown</small>
                        </div>
                        <textarea
                          ref={editor}
                          className="source-editor"
                          aria-label="Note content"
                          spellCheck
                          value={note.content}
                          onChange={(e) => update({ content: e.target.value })}
                          placeholder="Let a thought take shape…"
                        />
                        <div className="editor-hint">
                          <span>Link ideas with [[note title]]</span>
                          <kbd>⌘ E to read</kbd>
                        </div>
                      </div>
                    ) : (
                      <div className="prose">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) =>
                              href?.startsWith("#note-") ? (
                                <button
                                  className="wiki-link"
                                  onClick={() =>
                                    inlineLink(
                                      decodeURIComponent(href.slice(6)),
                                    )
                                  }
                                >
                                  <FileText size={14} />
                                  {children}
                                  <ArrowUpRight size={12} />
                                </button>
                              ) : (
                                <a href={href} target="_blank" rel="noreferrer">
                                  {children}
                                </a>
                              ),
                            h2: ({ children }) => (
                              <h2
                                id={
                                  "heading-" +
                                  String(children).replace(/\W+/g, "-")
                                }
                              >
                                {children}
                              </h2>
                            ),
                            input: ({ checked, ...props }) => (
                              <input
                                {...props}
                                type="checkbox"
                                checked={checked}
                                disabled
                                aria-label={
                                  checked ? "Completed task" : "Open task"
                                }
                              />
                            ),
                          }}
                        >
                          {markdown}
                        </ReactMarkdown>
                      </div>
                    )}
                    {!editing && note.id === "welcome" && (
                      <div className="begin-card">
                        <div className="begin-symbol">
                          <Pencil size={19} />
                        </div>
                        <div>
                          <strong>What’s on your mind?</strong>
                          <p>Your next idea deserves a note of its own.</p>
                        </div>
                        <button
                          onClick={() => {
                            setNewTitle("");
                            setModal("new");
                          }}
                        >
                          Create a note <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                    <div className="document-bottom">
                      <span className="small-rock">
                        <Rock small />
                      </span>
                      <span>A thought today. A connection tomorrow.</span>
                    </div>
                  </div>
                </article>
                <footer className="editor-status">
                  <span>
                    {syncIcon} {syncLabel}
                  </span>
                  <div>
                    <span>
                      {note.content.trim().split(/\s+/).filter(Boolean).length}{" "}
                      words
                    </span>
                    <span>{note.content.length} characters</span>
                    <span>Markdown</span>
                    <span className="status-dot" />
                  </div>
                </footer>
              </section>
              {rightPanel && (
                <aside className="details-panel">
                  <div className="details-top">
                    <span>IN THIS NOTE</span>
                    <IconButton
                      label="Close details"
                      onClick={() => setRightPanel(false)}
                    >
                      <PanelRight size={15} />
                    </IconButton>
                  </div>
                  <div className="detail-section outline-section">
                    <h3>
                      <List size={15} /> Outline
                    </h3>
                    {headings.length ? (
                      headings.map((h, i) => (
                        <button
                          key={h + i}
                          className="outline-item"
                          onClick={() => {
                            if (editing) setEditing(false);
                            setTimeout(
                              () =>
                                document
                                  .getElementById(
                                    "heading-" + h.replace(/\W+/g, "-"),
                                  )
                                  ?.scrollIntoView({
                                    behavior: window.matchMedia(
                                      "(prefers-reduced-motion: reduce)",
                                    ).matches
                                      ? "auto"
                                      : "smooth",
                                    block: "start",
                                  }),
                              20,
                            );
                          }}
                        >
                          <span />
                          {h}
                        </button>
                      ))
                    ) : (
                      <p className="muted detail-empty">
                        Headings will appear here.
                      </p>
                    )}
                  </div>
                  <div className="detail-section connections-section">
                    <div className="detail-section-title">
                      <h3>
                        <Network size={15} /> Connections
                      </h3>
                      <IconButton
                        label="Open full graph"
                        onClick={() => setView("graph")}
                      >
                        <Maximize2 size={13} />
                      </IconButton>
                    </div>
                    <div className="mini-graph">
                      <Graph
                        notes={live}
                        activeId={note.id}
                        onSelect={openNote}
                        compact
                      />
                      <button
                        className="graph-expand"
                        onClick={() => setView("graph")}
                      >
                        Explore your graph <ArrowUpRight size={11} />
                      </button>
                    </div>
                    <div className="graph-caption">
                      <span className="legend-dot" /> This note
                      <span className="legend-dot pale" /> Connected ideas
                    </div>
                  </div>
                  <div className="detail-section backlinks">
                    <div className="detail-section-title">
                      <h3>
                        <Link2 size={15} /> Backlinks
                      </h3>
                      <span className="count-badge">{backlinks.length}</span>
                    </div>
                    <p className="detail-helper">Notes that lead you here.</p>
                    {backlinks.length ? (
                      backlinks.map((n) => (
                        <button
                          className="backlink-card"
                          key={n.id}
                          onClick={() => openNote(n.id)}
                        >
                          <span>
                            <FileText size={13} />
                            <strong>{n.title}</strong>
                          </span>
                          <small>
                            {n.folder} <ArrowUpRight size={12} />
                          </small>
                        </button>
                      ))
                    ) : (
                      <p className="detail-empty">
                        Link to this note with [[{note.title}]] to start a
                        connection.
                      </p>
                    )}
                  </div>
                  <div className="detail-section outgoing">
                    <div className="detail-section-title">
                      <h3>
                        <ArrowUpRight size={15} /> Outgoing links
                      </h3>
                      <span className="count-badge">{links.length}</span>
                    </div>
                    {links.map((title, i) => (
                      <button key={title + i} onClick={() => inlineLink(title)}>
                        <FileText size={13} />
                        <span>{title}</span>
                      </button>
                    ))}
                  </div>
                  <div className="sidebar-tip">
                    <span>✧</span>
                    <p>
                      Ideas grow stronger
                      <br />
                      when they’re connected.
                    </p>
                  </div>
                </aside>
              )}
            </>
          ) : view === "graph" ? (
            <section className="graph-page">
              <div className="page-heading">
                <div>
                  <div className="page-eyebrow">THE BIGGER PICTURE</div>
                  <h1>Your thoughts, connected.</h1>
                  <p>Follow a thread. See where it takes you.</p>
                </div>
                <button className="soft-button" onClick={() => setView("note")}>
                  <FileText size={15} /> Back to note
                </button>
              </div>
              <div
                className="full-graph"
                style={{ "--graph-zoom": zoom } as React.CSSProperties}
              >
                <div
                  className="graph-inner"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <Graph
                    notes={live}
                    activeId={note?.id || ""}
                    onSelect={openNote}
                  />
                </div>
                <div className="graph-stats">
                  <span>{live.length} notes</span>
                  <span>·</span>
                  <span>
                    {live.reduce(
                      (sum, n) => sum + (n.content.match(/\[\[/g) || []).length,
                      0,
                    )}{" "}
                    connections
                  </span>
                </div>
                <div className="graph-controls">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.65, z - 0.15))}
                    aria-label="Zoom out"
                  >
                    −
                  </button>
                  <button onClick={() => setZoom(1)}>
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="graph-bottom-note">
                <span className="legend-dot" />
                Your active note
                <span className="legend-dot pale" />
                Your connected thoughts
                <span>Click any idea to open its note</span>
              </div>
            </section>
          ) : (
            <section className="collection-page">
              <div className="page-heading">
                <div>
                  <div className="page-eyebrow">YOUR PERSONAL LIBRARY</div>
                  <h1>{filter}</h1>
                  <p>
                    {filter === "Trash"
                      ? "A second chance for your thoughts."
                      : `${listed.length} little seeds of something bigger.`}
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    setNewTitle("");
                    setModal("new");
                  }}
                >
                  <Plus size={15} /> New note
                </button>
              </div>
              <div className="collection-filter">
                <button
                  className={filter === "All notes" ? "active" : ""}
                  onClick={() => setFilter("All notes")}
                >
                  All notes
                </button>
                <button
                  className={filter === "Starred" ? "active" : ""}
                  onClick={() => setFilter("Starred")}
                >
                  <Star size={13} />
                  Starred
                </button>
                <button
                  className={filter === "Trash" ? "active" : ""}
                  onClick={() => setFilter("Trash")}
                >
                  <Trash2 size={13} />
                  Trash
                </button>
              </div>
              <div className="note-grid">
                {listed
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map((n) => (
                    <button
                      key={n.id}
                      className="note-card"
                      onClick={() => {
                        if (n.deleted) {
                          saveNote({
                            ...n,
                            deleted: false,
                            updatedAt: Date.now(),
                          });
                          notify("Note restored");
                        } else openNote(n.id);
                      }}
                    >
                      <div className="note-card-top">
                        <span>
                          <FileText size={18} />
                        </span>
                        {n.starred && <Star size={14} />}
                      </div>
                      <h3>{n.title}</h3>
                      <p>
                        {n.content.replace(/[#*>`\[\]]/g, "").slice(0, 145) ||
                          "A little room for your next idea…"}
                      </p>
                      <div>
                        <span>{n.deleted ? "Click to restore" : n.folder}</span>
                        <small>{dateFormat.format(n.updatedAt)}</small>
                      </div>
                    </button>
                  ))}
              </div>
              {!listed.length && (
                <div className="empty-state">
                  <BookOpen size={34} />
                  <h2>A little room to grow.</h2>
                  <p>
                    {filter === "Trash"
                      ? "Your trash is empty."
                      : "Your notes will appear here."}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
      <input
        type="file"
        ref={importer}
        accept=".md,.txt"
        multiple
        hidden
        onChange={(e) => {
          importFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {modal === "search" && (
        <Modal title="Find a thought" onClose={() => setModal(null)} wide>
          <div className="command-input">
            <Search size={20} />
            <input
              aria-label="Search your vault"
              autoFocus
              placeholder="Search notes, ideas, or anything in between…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>esc</kbd>
          </div>
          <div className="command-results">
            <div className="command-label">
              {query ? "MATCHING NOTES" : "YOUR NOTES"}
            </div>
            {results.map((n) => (
              <button key={n.id} onClick={() => openNote(n.id)}>
                <FileText size={17} />
                <span>
                  <strong>{n.title}</strong>
                  <small>{n.folder}</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
            {!results.length && (
              <div className="search-empty">
                No notes found. A new idea, perhaps?
              </div>
            )}
          </div>
          <div className="command-footer">
            <button
              onClick={() => {
                setNewTitle(query);
                setModal("new");
              }}
            >
              <Plus size={14} />
              Create a new note
            </button>
            <span>Search your whole vault</span>
          </div>
        </Modal>
      )}
      {modal === "new" && (
        <Modal title="A new beginning" onClose={() => setModal(null)}>
          <p className="modal-subtitle">Every idea starts somewhere.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create(newTitle.trim() || "Untitled note", newFolder);
              setNewTitle("");
            }}
          >
            <label className="field-label">
              Note title
              <input
                autoFocus
                placeholder="What’s on your mind?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={200}
              />
            </label>
            <label className="field-label">
              Add to
              <select
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
              >
                {folders.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <button className="primary-button full-width" type="submit">
              <Plus size={16} />
              Create note
            </button>
          </form>
        </Modal>
      )}
      {modal === "auth" && (
        <Modal
          title={
            authMode === "register"
              ? "Your thoughts. Everywhere."
              : "Welcome back."
          }
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          <div className="auth-symbol">
            <Rock />
          </div>
          <p className="modal-subtitle">
            {authMode === "register"
              ? "Create your private vault and keep your notes in sync across devices."
              : "Sign in to pick up where your thoughts left off."}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setAuthError("");
              const data = new FormData(e.currentTarget);
              try {
                if (authMode === "register")
                  await vault.register(
                    String(data.get("name")),
                    String(data.get("email")),
                    String(data.get("password")),
                  );
                else
                  await vault.login(
                    String(data.get("email")),
                    String(data.get("password")),
                  );
                setModal(null);
                notify(
                  authMode === "register"
                    ? "Your private vault is ready"
                    : "Welcome back",
                );
              } catch (error) {
                setAuthError(
                  error instanceof Error
                    ? error.message
                    : "Could not connect. Try again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {authMode === "register" && (
              <label className="field-label">
                Your name
                <input
                  name="name"
                  placeholder="How should we call you?"
                  autoComplete="name"
                  required
                  maxLength={80}
                />
              </label>
            )}
            <label className="field-label">
              Email address
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label className="field-label">
              Password
              <input
                name="password"
                type="password"
                autoComplete={
                  authMode === "register" ? "new-password" : "current-password"
                }
                placeholder={
                  authMode === "register"
                    ? "At least 10 characters"
                    : "Your password"
                }
                minLength={authMode === "register" ? 10 : 1}
                required
              />
            </label>
            {authError && (
              <div className="form-error" role="alert">
                {authError}
              </div>
            )}
            <button disabled={busy} className="primary-button full-width">
              {busy ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Cloud size={16} />
              )}{" "}
              {authMode === "register"
                ? "Create my vault"
                : "Sign in to Bedrock"}
            </button>
          </form>
          <p className="auth-switch">
            {authMode === "register"
              ? "Already have a vault?"
              : "New to Bedrock?"}{" "}
            <button
              onClick={() => {
                setAuthMode(authMode === "register" ? "login" : "register");
                setAuthError("");
              }}
            >
              {authMode === "register" ? "Sign in" : "Create a vault"}
            </button>
          </p>
          <p className="auth-fine">
            {authMode === "register"
              ? "Your current notes will come with you. Keep your password safe; password recovery is not available yet."
              : "Your notes are private to your account."}
          </p>
        </Modal>
      )}
      {modal === "settings" && (
        <Modal title="Make yourself at home" onClose={() => setModal(null)}>
          <div className="settings-section">
            <label>Appearance</label>
            <div className="theme-options">
              <button
                className={theme === "light" ? "active" : ""}
                onClick={() => setTheme("light")}
              >
                <Sun size={18} /> Daylight{" "}
                {theme === "light" && <Check size={14} />}
              </button>
              <button
                className={theme === "dark" ? "active" : ""}
                onClick={() => setTheme("dark")}
              >
                <Moon size={18} /> After hours{" "}
                {theme === "dark" && <Check size={14} />}
              </button>
            </div>
          </div>
          <div className="settings-section">
            <label>Your vault</label>
            <p>
              {user
                ? `Signed in as ${user.email}`
                : "Your notes are saved in this browser. Sign in to sync them across devices."}
            </p>
            {user ? (
              <>
                <div className="settings-sync">
                  {syncIcon}
                  {syncLabel}
                </div>
                <button
                  className="soft-button"
                  onClick={async () => {
                    try {
                      await vault.logout();
                      setModal(null);
                      notify("Signed out");
                    } catch (e) {
                      notify(
                        e instanceof Error ? e.message : "Could not sign out",
                      );
                    }
                  }}
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </>
            ) : (
              <button
                className="primary-button"
                onClick={() => setModal("auth")}
              >
                <Cloud size={15} />
                Turn on sync
              </button>
            )}
          </div>
          <div className="settings-section">
            <label>Your notes belong to you</label>
            <div className="settings-rows">
              <button onClick={() => importer.current?.click()}>
                <Upload size={16} />
                <span>Import Markdown files</span>
                <ChevronRight size={15} />
              </button>
              <button
                onClick={() => {
                  download(
                    "bedrock-vault.json",
                    JSON.stringify(
                      {
                        name: "Bedrock vault",
                        exportedAt: new Date().toISOString(),
                        notes: live,
                      },
                      null,
                      2,
                    ),
                    "application/json",
                  );
                  notify("Vault exported");
                }}
              >
                <ArrowDownToLine size={16} />
                <span>Export your vault</span>
                <ChevronRight size={15} />
              </button>
              <button onClick={() => setModal("help")}>
                <CircleHelp size={16} />
                <span>Keyboard shortcuts</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <div className="settings-brand">
            <Rock small /> Bedrock <span>A space to think. v1.0</span>
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="A few little shortcuts" onClose={() => setModal(null)}>
          <p className="modal-subtitle">Stay in the flow.</p>
          <div className="shortcut-list">
            {[
              ["Find anything", "⌘ / Ctrl K"],
              ["Create a note", "⌘ / Ctrl N"],
              ["Edit / read a note", "⌘ / Ctrl E"],
              ["Close a dialog", "Esc"],
              ["Link two thoughts", "[[note title]]"],
            ].map(([a, b]) => (
              <div key={a}>
                <span>{a}</span>
                <kbd>{b}</kbd>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
