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
  Files,
  FilePlus2,
  FolderPlus,
  ChevronsUpDown,
  ChevronsUp,
  ArrowDownAZ,
  Tags,
  Bookmark,
  Settings,
  Terminal,
  SlidersHorizontal,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Note } from "./types";
import { seed } from "./seed";
import { useVault } from "./useVault";
import Graph from "./Graph";
import SettingsPanel from "./SettingsPanel";

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
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const el = ref.current;
    (
      el?.querySelector<HTMLElement>("input,textarea,select") ||
      el?.querySelector<HTMLElement>("button")
    )?.focus();
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
        className={"modal " + (wide ? "wide " : "") + className}
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
  const [mobilePanel, setMobilePanel] = useState(false);
  const [focus, setFocus] = useState(false);
  const [modal, setModal] = useState<
    | "search"
    | "commands"
    | "auth"
    | "settings"
    | "new"
    | "folder"
    | "help"
    | null
  >(null);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(0);
  useEffect(() => setSelection(0), [query, modal]);
  const [authMode, setAuthMode] = useState("register");
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newFolder, setNewFolder] = useState("Ideas");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bedrock-theme-obsidian") || "dark",
  );
  const [newTag, setNewTag] = useState("");
  const [zoom, setZoom] = useState(1);
  const [sidebarMode, setSidebarMode] = useState<
    "files" | "search" | "bookmarks" | "tags"
  >("files");
  const [panelMode, setPanelMode] = useState<
    "graph" | "outline" | "backlinks" | "links"
  >("graph");
  const [sortByName, setSortByName] = useState(false);
  const [folderDraft, setFolderDraft] = useState("");
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [readableWidth, setReadableWidth] = useState(
    () => localStorage.getItem("bedrock-readable") !== "false",
  );
  const [fontSize, setFontSize] = useState(
    () => Number(localStorage.getItem("bedrock-fontsize")) || 14,
  );
  const [spellcheck, setSpellcheck] = useState(
    () => localStorage.getItem("bedrock-spellcheck") !== "false",
  );
  const history = useRef(["welcome"]);
  const historyPosition = useRef(0);
  const [historyVersion, setHistoryVersion] = useState(0);
  const allFolders = [
    ...new Set([
      ...folders,
      ...extraFolders,
      ...notes.filter((n) => !n.deleted).map((n) => n.folder),
    ]),
  ];
  useEffect(() => {
    try {
      setExtraFolders(
        JSON.parse(
          localStorage.getItem("bedrock-folders:" + (user?.id || "guest")) ||
            "[]",
        ),
      );
    } catch {
      setExtraFolders([]);
    }
  }, [user?.id]);
  useEffect(() => {
    localStorage.setItem("bedrock-readable", String(readableWidth));
    localStorage.setItem("bedrock-fontsize", String(fontSize));
    localStorage.setItem("bedrock-spellcheck", String(spellcheck));
  }, [readableWidth, fontSize, spellcheck]);
  const toggleSidebar = () => {
    if (window.innerWidth <= 700) setSidebar((v) => !v);
    else setSidebarHidden((v) => !v);
    setFocus(false);
  };
  const goHistory = (delta: number) => {
    const index = historyPosition.current + delta;
    if (index < 0 || index >= history.current.length) return;
    historyPosition.current = index;
    const id = history.current[index];
    setMobilePanel(false);
    setActiveId(id);
    setView("note");
    setEditing(false);
    setTabs((t) => (t.includes(id) ? t : [...t, id]));
    setHistoryVersion((v) => v + 1);
  };
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
    if (history.current[historyPosition.current] !== id) {
      history.current = history.current.slice(0, historyPosition.current + 1);
      history.current.push(id);
      historyPosition.current = history.current.length - 1;
      setHistoryVersion((v) => v + 1);
    }
    setMobilePanel(false);
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
    localStorage.setItem("bedrock-theme-obsidian", theme);
  }, [theme]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        ["k", "o"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        setModal((m) => (m === "search" ? null : "search"));
        setQuery("");
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setQuery("");
        setModal((m) => (m === "commands" ? null : "commands"));
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
        setMobilePanel(false);
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
  const localGraphNotes = note
    ? live.filter((candidate) => {
        if (candidate.id === note.id) return true;
        const targets = (content: string) =>
          [...content.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((match) =>
            match[1].split("|")[0].split("#")[0].trim().toLowerCase(),
          );
        return (
          targets(note.content).includes(
            candidate.title.trim().toLowerCase(),
          ) ||
          targets(candidate.content).includes(note.title.trim().toLowerCase())
        );
      })
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
  const commandActions = [
    {
      title: "Create new note",
      hint: "Ctrl N",
      run: () => {
        setNewTitle("");
        setModal("new");
      },
    },
    {
      title: "Open quick switcher",
      hint: "Ctrl O",
      run: () => {
        setQuery("");
        setModal("search");
      },
    },
    {
      title: "Daily notes: Open today’s daily note",
      hint: "",
      run: () => {
        setModal(null);
        daily();
      },
    },
    {
      title: "Graph view: Open graph view",
      hint: "",
      run: () => {
        setView("graph");
        setModal(null);
      },
    },
    { title: "Open settings", hint: "", run: () => setModal("settings") },
    {
      title: "Toggle reading view",
      hint: "Ctrl E",
      run: () => {
        setEditing((v) => !v);
        setModal(null);
      },
    },
    {
      title: "Toggle left sidebar",
      hint: "",
      run: () => {
        toggleSidebar();
        setModal(null);
      },
    },
    {
      title: "Toggle right sidebar",
      hint: "",
      run: () => {
        setRightPanel((v) => !v);
        setModal(null);
      },
    },
    {
      title: "Files: Show all notes",
      hint: "",
      run: () => {
        setView("collection");
        setFilter("All notes");
        setModal(null);
      },
    },
    {
      title: "Files: Import Markdown files",
      hint: "",
      run: () => importer.current?.click(),
    },
  ].filter((command) =>
    command.title.toLowerCase().includes(query.toLowerCase()),
  );
  const navigateResults = (
    e: React.KeyboardEvent<HTMLInputElement>,
    count: number,
    choose: () => void,
  ) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelection((i) => Math.min(i + 1, count - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelection((i) => Math.max(0, i - 1));
    }
    if (e.key === "Enter" && count) {
      e.preventDefault();
      choose();
    }
  };
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
  const openDetails = (mode: typeof panelMode) => {
    setView("note");
    setRightPanel(true);
    setPanelMode(mode);
    setMobilePanel(window.innerWidth <= 900);
  };
  const renderNoteOptions = () =>
    note && (
      <div className="menu-anchor">
        <IconButton label="Note options" onClick={() => setMenu(!menu)}>
          <MoreHorizontal size={19} />
        </IconButton>
        {menu && (
          <>
            <div className="menu-scrim" onClick={() => setMenu(false)} />
            <div className="dropdown">
              <button
                onClick={() => {
                  update({ starred: !note.starred });
                  setMenu(false);
                }}
              >
                <Bookmark size={15} />
                {note.starred ? "Remove bookmark" : "Bookmark"}
              </button>
              <button
                onClick={() => {
                  setFocus((v) => !v);
                  setMenu(false);
                }}
              >
                <Maximize2 size={15} />
                Focus mode
              </button>
              <button
                onClick={() => {
                  openDetails("graph");
                  setMenu(false);
                }}
              >
                <GitBranch size={15} />
                Open local graph
              </button>
              <button
                onClick={() => {
                  openDetails("backlinks");
                  setMenu(false);
                }}
              >
                <Link2 size={15} />
                Show backlinks
              </button>
              <button onClick={exportNote}>
                <ArrowDownToLine size={15} />
                Export Markdown
              </button>
              <button
                onClick={() => {
                  create(note.title + " (copy)", note.folder, note.content);
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
    );
  return (
    <div
      className={
        "app " +
        (focus ? "focus-mode " : "") +
        (sidebarHidden ? "sidebar-hidden " : "") +
        (!readableWidth ? "wide-editor" : "")
      }
      style={{ "--editor-font-size": `${fontSize}px` } as React.CSSProperties}
    >
      {mobilePanel && (
        <div className="details-scrim" onClick={() => setMobilePanel(false)} />
      )}
      {sidebar && (
        <div className="mobile-scrim" onClick={() => setSidebar(false)} />
      )}
      <aside className={"sidebar " + (sidebar ? "mobile-open" : "")}>
        <div className="sidebar-header">
          <IconButton
            label="Files"
            active={sidebarMode === "files"}
            onClick={() => setSidebarMode("files")}
          >
            <Files size={17} />
          </IconButton>
          <IconButton
            label="Find anything"
            active={sidebarMode === "search"}
            onClick={() => {
              setSidebarMode("search");
              setQuery("");
            }}
          >
            <Search size={17} />
          </IconButton>
          <IconButton
            label="Bookmarks"
            active={sidebarMode === "bookmarks"}
            onClick={() => setSidebarMode("bookmarks")}
          >
            <Bookmark size={17} />
          </IconButton>
          <IconButton
            label="Tags"
            active={sidebarMode === "tags"}
            onClick={() => setSidebarMode("tags")}
          >
            <Tags size={17} />
          </IconButton>
          <IconButton label="Collapse sidebar" onClick={toggleSidebar}>
            <PanelLeft size={16} />
          </IconButton>
        </div>
        <div className="sidebar-tools">
          <IconButton
            label="New note"
            onClick={() => {
              setNewTitle("");
              setModal("new");
            }}
          >
            <FilePlus2 size={17} />
          </IconButton>
          <IconButton
            label="New folder"
            onClick={() => {
              setFolderDraft("");
              setModal("folder");
            }}
          >
            <FolderPlus size={17} />
          </IconButton>
          <IconButton
            label="Sort files by name"
            active={sortByName}
            onClick={() => setSortByName((v) => !v)}
          >
            <ArrowDownAZ size={17} />
          </IconButton>
          <IconButton
            label="Collapse all folders"
            onClick={() =>
              setCollapsed((c) =>
                c.length === allFolders.length ? [] : allFolders,
              )
            }
          >
            <ChevronsUp size={17} />
          </IconButton>
        </div>
        {sidebarMode === "search" && (
          <div className="sidebar-search">
            <Search size={15} />
            <input
              aria-label="Search your vault"
              autoFocus
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={13} />
              </button>
            )}
          </div>
        )}
        <div className="sidebar-scroll">
          {sidebarMode === "files" && (
            <>
              {allFolders.map((folder) => {
                const items = live
                  .filter((n) => n.folder === folder)
                  .sort((a, b) =>
                    sortByName ? a.title.localeCompare(b.title) : 0,
                  );
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
                      <span>{folder}</span>
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
                            title={n.title}
                          >
                            <span>{n.title}</span>
                          </button>
                        ))}
                        {!items.length && (
                          <button
                            className="empty-folder"
                            onClick={() => {
                              setNewFolder(folder);
                              setNewTitle("");
                              setModal("new");
                            }}
                          >
                            New note
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
          {sidebarMode === "search" && (
            <div className="quick-search-results">
              <div className="section-label">
                {results.length} matching files
              </div>
              {results.map((n) => (
                <button
                  className="search-result"
                  key={n.id}
                  onClick={() => openNote(n.id)}
                >
                  <span>{n.title}</span>
                  <small>
                    {n.content.replace(/[#*>`\[\]]/g, "").slice(0, 90)}
                  </small>
                </button>
              ))}
              {!results.length && (
                <p className="detail-empty">No matches found.</p>
              )}
            </div>
          )}
          {sidebarMode === "bookmarks" && (
            <>
              <div className="section-label">Bookmarks</div>
              {live
                .filter((n) => n.starred)
                .map((n) => (
                  <button
                    key={n.id}
                    className="sidebar-note"
                    onClick={() => openNote(n.id)}
                  >
                    <FileText size={14} />
                    <span>{n.title}</span>
                  </button>
                ))}
              {!live.some((n) => n.starred) && (
                <p className="detail-empty">Bookmark a note from its menu.</p>
              )}
            </>
          )}
          {sidebarMode === "tags" && (
            <div className="tag-list">
              <div className="section-label">Tags</div>
              {[...new Set(live.flatMap((n) => n.tags))].sort().map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setFilter("#" + tag);
                    setView("collection");
                    setSidebar(false);
                  }}
                >
                  <Hash size={14} />
                  <span>{tag}</span>
                  <small>
                    {live.filter((n) => n.tags.includes(tag)).length}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="sidebar-actions">
          <IconButton
            label="All notes"
            active={view === "collection"}
            onClick={() => {
              setView("collection");
              setFilter("All notes");
              setSidebar(false);
            }}
          >
            <Files size={17} />
          </IconButton>
          <IconButton label="Daily note" onClick={daily}>
            <CalendarDays size={17} />
          </IconButton>
          <IconButton
            label="Graph view"
            active={view === "graph"}
            onClick={() => {
              setView("graph");
              setSidebar(false);
            }}
          >
            <Network size={17} />
          </IconButton>
          <IconButton
            label="Import Markdown files"
            onClick={() => importer.current?.click()}
          >
            <Upload size={17} />
          </IconButton>
        </div>
        <div className="sidebar-footer">
          <button
            className="vault-switch"
            title="Vault settings"
            onClick={() => setModal("settings")}
          >
            <span>Bedrock</span>
            <ChevronsUpDown size={14} />
          </button>
          <IconButton
            label="Sync"
            onClick={() => setModal(user ? "settings" : "auth")}
          >
            <Cloud size={16} />
          </IconButton>
          <IconButton label="Help" onClick={() => setModal("help")}>
            <CircleHelp size={16} />
          </IconButton>
          <IconButton label="Settings" onClick={() => setModal("settings")}>
            <Settings size={16} />
          </IconButton>
        </div>
      </aside>
      <main className="main-shell">
        <div className="mobile-header">
          <IconButton label="Toggle sidebar" onClick={toggleSidebar}>
            <PanelLeft size={19} />
          </IconButton>
          <span>
            {view === "note"
              ? note?.title
              : view === "graph"
                ? "Graph view"
                : filter}
          </span>
          <IconButton
            label={editing ? "Reading view" : "Editing view"}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? <BookOpen size={18} /> : <Pencil size={18} />}
          </IconButton>
          {view === "note" && note ? (
            renderNoteOptions()
          ) : (
            <IconButton
              label="Mobile settings"
              onClick={() => setModal("settings")}
            >
              <Settings size={19} />
            </IconButton>
          )}
        </div>
        <div className="tabs-row">
          <div className="tabs">
            <div className="sidebar-reopen">
              <IconButton label="Toggle sidebar" onClick={toggleSidebar}>
                <PanelLeft size={16} />
              </IconButton>
            </div>
            {view !== "note" && (
              <div className="note-tab active utility-tab">
                <button onClick={() => {}}>
                  {view === "graph" ? (
                    <Network size={14} />
                  ) : (
                    <Files size={14} />
                  )}
                  <span>{view === "graph" ? "Graph view" : filter}</span>
                </button>
                <button
                  className="tab-close"
                  aria-label="Close view"
                  onClick={() => setView("note")}
                >
                  <X size={12} />
                </button>
              </div>
            )}
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
            <IconButton
              label="Toggle details panel"
              active={rightPanel}
              onClick={() => {
                if (window.innerWidth <= 900) openDetails(panelMode);
                else setRightPanel((v) => !v);
              }}
            >
              <PanelRight size={16} />
            </IconButton>
          </div>
          {rightPanel && view === "note" && note && (
            <div className="pane-tab-header">
              <div className="note-tab active">
                <button onClick={() => setPanelMode("graph")}>
                  {panelMode === "graph" ? (
                    <GitBranch size={14} />
                  ) : panelMode === "outline" ? (
                    <List size={14} />
                  ) : (
                    <Link2 size={14} />
                  )}
                  <span>
                    {panelMode === "graph"
                      ? `Graph of ${note.title}`
                      : panelMode === "outline"
                        ? "Outline"
                        : panelMode === "backlinks"
                          ? "Backlinks"
                          : "Outgoing links"}
                  </span>
                </button>
                <button
                  className="tab-close"
                  aria-label="Close details"
                  onClick={() => setRightPanel(false)}
                >
                  <X size={12} />
                </button>
              </div>
              <IconButton
                label="Open full graph"
                onClick={() => setView("graph")}
              >
                <Plus size={15} />
              </IconButton>
            </div>
          )}
        </div>
        <div className="workspace">
          {view === "note" && note ? (
            <>
              <section className="document-pane">
                <div className="document-toolbar">
                  <div className="doc-history">
                    <button
                      aria-label="Go back"
                      title="Go back"
                      disabled={historyPosition.current === 0}
                      onClick={() => goHistory(-1)}
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <button
                      aria-label="Go forward"
                      title="Go forward"
                      disabled={
                        historyPosition.current >= history.current.length - 1
                      }
                      onClick={() => goHistory(1)}
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="doc-location">
                    <span>{note.folder}</span>
                    <ChevronRight size={12} />
                    <span className="doc-title-small">{note.title}</span>
                  </div>
                  <div className="document-actions">
                    <button
                      className={"mode-toggle " + (editing ? "editing" : "")}
                      aria-label={editing ? "Read" : "Edit"}
                      title={editing ? "Reading view" : "Editing view"}
                      onClick={() => setEditing(!editing)}
                    >
                      {editing ? <BookOpen size={14} /> : <Pencil size={14} />}
                      <span>{editing ? "Read" : "Edit"}</span>
                    </button>
                    {renderNoteOptions()}
                  </div>
                </div>
                <article ref={article} className="document-scroll">
                  <div className="document-content">
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
                    <div className="note-tags">
                      {note.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setFilter("#" + tag);
                            setView("collection");
                          }}
                        >
                          <span>#</span>
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
                    {editing ? (
                      <div className="markdown-editor">
                        <textarea
                          ref={editor}
                          className="source-editor"
                          aria-label="Note content"
                          spellCheck={spellcheck}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === "b") {
                              e.preventDefault();
                              format("**", "**");
                            }
                            if ((e.metaKey || e.ctrlKey) && e.key === "i") {
                              e.preventDefault();
                              format("*", "*");
                            }
                          }}
                          value={note.content}
                          onChange={(e) => update({ content: e.target.value })}
                          placeholder="Start writing..."
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
                                  {children}
                                </button>
                              ) : (
                                <a href={href} target="_blank" rel="noreferrer">
                                  {children}
                                </a>
                              ),
                            h1: ({ children }) => (
                              <h1
                                id={
                                  "heading-" +
                                  String(children).replace(/\W+/g, "-")
                                }
                              >
                                {children}
                              </h1>
                            ),
                            h3: ({ children }) => (
                              <h3
                                id={
                                  "heading-" +
                                  String(children).replace(/\W+/g, "-")
                                }
                              >
                                {children}
                              </h3>
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
                  </div>
                </article>
              </section>
              {rightPanel && (
                <aside
                  className={
                    "details-panel" + (mobilePanel ? " mobile-visible" : "")
                  }
                >
                  <div className="panel-mobile-heading">
                    <span>
                      {panelMode === "graph"
                        ? "Local graph"
                        : panelMode === "outline"
                          ? "Outline"
                          : panelMode === "backlinks"
                            ? "Backlinks"
                            : "Outgoing links"}
                    </span>
                    <IconButton
                      label="Close details panel"
                      onClick={() => setMobilePanel(false)}
                    >
                      <X size={18} />
                    </IconButton>
                  </div>
                  <div className="panel-tools">
                    <IconButton
                      label="Local graph"
                      active={panelMode === "graph"}
                      onClick={() => setPanelMode("graph")}
                    >
                      <GitBranch size={16} />
                    </IconButton>
                    <IconButton
                      label="Outline"
                      active={panelMode === "outline"}
                      onClick={() => setPanelMode("outline")}
                    >
                      <List size={16} />
                    </IconButton>
                    <IconButton
                      label="Backlinks"
                      active={panelMode === "backlinks"}
                      onClick={() => setPanelMode("backlinks")}
                    >
                      <Link2 size={16} />
                    </IconButton>
                    <IconButton
                      label="Outgoing links"
                      active={panelMode === "links"}
                      onClick={() => setPanelMode("links")}
                    >
                      <ArrowUpRight size={16} />
                    </IconButton>
                    <IconButton
                      label="Expand graph"
                      onClick={() => setView("graph")}
                    >
                      <Maximize2 size={15} />
                    </IconButton>
                  </div>
                  {panelMode === "graph" ? (
                    <div className="local-graph-view">
                      <Graph
                        notes={localGraphNotes}
                        activeId={note.id}
                        onSelect={openNote}
                        showLabels={false}
                      />
                    </div>
                  ) : (
                    <div className="panel-content">
                      {panelMode === "outline" && (
                        <>
                          <h3>Outline</h3>
                          {headings.length ? (
                            headings.map((h, i) => (
                              <button
                                key={h + i}
                                className="outline-item"
                                onClick={() => {
                                  setEditing(false);
                                  setTimeout(
                                    () =>
                                      document
                                        .getElementById(
                                          "heading-" + h.replace(/\W+/g, "-"),
                                        )
                                        ?.scrollIntoView({ block: "start" }),
                                    20,
                                  );
                                }}
                              >
                                <ChevronRight size={12} />
                                {h}
                              </button>
                            ))
                          ) : (
                            <p className="detail-empty">No headings found.</p>
                          )}
                        </>
                      )}
                      {panelMode === "backlinks" && (
                        <>
                          <h3>
                            Linked mentions{" "}
                            <span className="count-badge">
                              {backlinks.length}
                            </span>
                          </h3>
                          {backlinks.length ? (
                            backlinks.map((n) => (
                              <button
                                key={n.id}
                                className="backlink-card"
                                onClick={() => openNote(n.id)}
                              >
                                <strong>{n.title}</strong>
                                <p>
                                  {n.content
                                    .split("\n")
                                    .filter(Boolean)
                                    .find((line) =>
                                      line
                                        .toLowerCase()
                                        .includes(note.title.toLowerCase()),
                                    ) || n.content.slice(0, 100)}
                                </p>
                              </button>
                            ))
                          ) : (
                            <p className="detail-empty">No backlinks found.</p>
                          )}
                          <h3 className="unlinked-heading">
                            Unlinked mentions{" "}
                            <span className="count-badge">
                              {
                                live.filter(
                                  (n) =>
                                    n.id !== note.id &&
                                    !backlinks.some((b) => b.id === n.id) &&
                                    n.content
                                      .toLowerCase()
                                      .includes(note.title.toLowerCase()),
                                ).length
                              }
                            </span>
                          </h3>
                          {live
                            .filter(
                              (n) =>
                                n.id !== note.id &&
                                !backlinks.some((b) => b.id === n.id) &&
                                n.content
                                  .toLowerCase()
                                  .includes(note.title.toLowerCase()),
                            )
                            .map((n) => (
                              <button
                                className="sidebar-note"
                                key={n.id}
                                onClick={() => openNote(n.id)}
                              >
                                <FileText size={14} />
                                {n.title}
                              </button>
                            ))}
                        </>
                      )}
                      {panelMode === "links" && (
                        <>
                          <h3>
                            Outgoing links{" "}
                            <span className="count-badge">{links.length}</span>
                          </h3>
                          {links.map((title, i) => (
                            <button
                              className="outline-item"
                              key={title + i}
                              onClick={() => inlineLink(title)}
                            >
                              <FileText size={14} />
                              {title}
                            </button>
                          ))}
                          {!links.length && (
                            <p className="detail-empty">No outgoing links.</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </aside>
              )}
            </>
          ) : view === "graph" ? (
            <section className="graph-page">
              <div className="page-heading">
                <div>
                  <h1>Graph view</h1>
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
                  <h1>{filter}</h1>
                  <p>
                    {filter === "Trash"
                      ? "Deleted notes can be restored here."
                      : `${listed.length} files`}
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
                          "Empty note"}
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
                  <h2>No files found.</h2>
                  <p>
                    {filter === "Trash"
                      ? "Your trash is empty."
                      : "Create a new note to get started."}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
        <footer className="editor-status">
          <button
            className={"sync-status " + (syncStatus === "error" ? "error" : "")}
            title={vault.error || syncLabel}
            onClick={() => {
              if (!user) setModal("auth");
              else vault.retrySync();
            }}
          >
            {syncIcon}
            <span>{syncLabel}</span>
          </button>
          <div>
            {note && (
              <>
                <button
                  onClick={() => {
                    openDetails("backlinks");
                  }}
                >
                  {backlinks.length}{" "}
                  {backlinks.length === 1 ? "backlink" : "backlinks"}
                </button>
                <span>
                  {note.content.trim().split(/\s+/).filter(Boolean).length}{" "}
                  words
                </span>
                <span>{note.content.length} characters</span>
              </>
            )}
          </div>
        </footer>
        <nav className="mobile-navigation">
          <button
            aria-label="Navigate back"
            disabled={historyPosition.current === 0}
            onClick={() => goHistory(-1)}
          >
            <ArrowLeft size={19} />
          </button>
          <button
            aria-label="Navigate forward"
            disabled={historyPosition.current >= history.current.length - 1}
            onClick={() => goHistory(1)}
          >
            <ArrowRight size={19} />
          </button>
          <button
            aria-label="Quick switcher"
            onClick={() => {
              setQuery("");
              setModal("search");
            }}
          >
            <Search size={19} />
          </button>
          <button
            aria-label="New note"
            onClick={() => {
              setNewTitle("");
              setModal("new");
            }}
          >
            <Plus size={21} />
          </button>
          <button
            aria-label="All notes"
            onClick={() => {
              setFilter("All notes");
              setView("collection");
            }}
          >
            <Files size={19} />
          </button>
          <button aria-label="Open navigation" onClick={() => setSidebar(true)}>
            <Menu size={21} />
          </button>
        </nav>
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
        <Modal title="Quick switcher" onClose={() => setModal(null)} wide>
          <div className="command-input">
            <Search size={20} />
            <input
              aria-label="Search your vault"
              autoFocus
              placeholder="Type to search your vault..."
              onKeyDown={(e) =>
                navigateResults(e, results.length, () =>
                  openNote(results[Math.max(0, selection)].id),
                )
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>esc</kbd>
          </div>
          <div className="command-results">
            <div className="command-label">
              {query ? "MATCHING NOTES" : "YOUR NOTES"}
            </div>
            {results.map((n, i) => (
              <button
                className={selection === i ? "is-selected" : ""}
                onMouseEnter={() => setSelection(i)}
                key={n.id}
                onClick={() => openNote(n.id)}
              >
                <FileText size={17} />
                <span>
                  <strong>{n.title}</strong>
                  <small>{n.folder}</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
            {!results.length && (
              <div className="search-empty">No matching files found.</div>
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
      {modal === "commands" && (
        <Modal title="Command palette" onClose={() => setModal(null)} wide>
          <div className="command-input">
            <Terminal size={18} />
            <input
              aria-label="Search commands"
              autoFocus
              placeholder="Type a command..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) =>
                navigateResults(e, commandActions.length, () =>
                  commandActions[Math.max(0, selection)].run(),
                )
              }
            />
          </div>
          <div className="command-results">
            {commandActions.map((command, i) => (
              <button
                className={i === selection ? "is-selected" : ""}
                key={command.title}
                onMouseEnter={() => setSelection(i)}
                onClick={command.run}
              >
                <span>
                  <strong>{command.title}</strong>
                </span>
                {command.hint && <kbd>{command.hint}</kbd>}
              </button>
            ))}
            {!commandActions.length && (
              <div className="search-empty">No commands found.</div>
            )}
          </div>
          <div className="command-footer">
            <span>↑↓ to navigate · Enter to execute · Esc to dismiss</span>
          </div>
        </Modal>
      )}
      {modal === "new" && (
        <Modal title="New note" onClose={() => setModal(null)}>
          <p className="modal-subtitle">
            Create a Markdown note in your vault.
          </p>
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
                placeholder="Untitled"
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
                {allFolders.map((f) => (
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
      {modal === "folder" && (
        <Modal title="New folder" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = folderDraft.trim();
              if (!name) return;
              if (allFolders.includes(name)) {
                notify("A folder with this name already exists");
                return;
              }
              const next = [...extraFolders, name];
              setExtraFolders(next);
              localStorage.setItem(
                "bedrock-folders:" + (user?.id || "guest"),
                JSON.stringify(next),
              );
              setCollapsed((c) => c.filter((f) => f !== name));
              setSidebarMode("files");
              setModal(null);
            }}
          >
            <label className="field-label">
              Folder name
              <input
                autoFocus
                maxLength={100}
                required
                value={folderDraft}
                onChange={(e) => setFolderDraft(e.target.value)}
                placeholder="Untitled folder"
              />
            </label>
            <button className="primary-button full-width" type="submit">
              Create folder
            </button>
          </form>
        </Modal>
      )}
      {modal === "auth" && (
        <Modal
          title={
            authMode === "register"
              ? "Create a Bedrock account"
              : "Sign in to Bedrock"
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
        <Modal
          title="Settings"
          wide
          className="settings-dialog"
          onClose={() => setModal(null)}
        >
          <SettingsPanel
            theme={theme}
            onTheme={setTheme}
            user={user}
            syncLabel={syncLabel}
            onSignIn={() => {
              setAuthMode("login");
              setAuthError("");
              setModal("auth");
            }}
            onLogout={async () => {
              await vault.logout();
              setModal(null);
              notify("Signed out");
            }}
            onImport={() => importer.current?.click()}
            onExport={() => {
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
            onHelp={() => setModal("help")}
            readableWidth={readableWidth}
            onReadableWidth={setReadableWidth}
            fontSize={fontSize}
            onFontSize={setFontSize}
            spellcheck={spellcheck}
            onSpellcheck={setSpellcheck}
          />
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="Keyboard shortcuts" onClose={() => setModal(null)}>
          <p className="modal-subtitle">
            Use these shortcuts to navigate your vault.
          </p>
          <div className="shortcut-list">
            {[
              ["Open quick switcher", "⌘ / Ctrl O"],
              ["Command palette", "⌘ / Ctrl P"],
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
