import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  Clock3,
  Cloud,
  Copy,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Hash,
  ImagePlus,
  Link2,
  List,
  Loader2,
  Maximize2,
  Menu,
  MoreHorizontal,
  Network,
  PanelLeft,
  PanelRight,
  Pencil,
  Plus,
  Search,
  Shuffle,
  SmilePlus,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
  CalendarDays,
  Bold,
  Italic,
  Heading2,
  ListTodo,
  Code,
  Quote,
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
  Home,
  Moon,
  Sun,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Note } from "./types";
import { seed } from "./seed";
import { useVault } from "./useVault";
import Graph from "./Graph";
import SettingsPanel from "./SettingsPanel";
import { covers, coverKeys, coverStyle, emojis, randomCover } from "./covers";
import {
  BrandMark,
  IconButton,
  Modal,
  NoteIcon,
  editedLabel,
  greeting,
} from "./ui";

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
const plain = (content: string) =>
  content.replace(/[#*>`\[\]_~-]/g, "").replace(/\s+/g, " ").trim();
const THEME_KEY = "bedrock-theme";
const ACCENT_KEY = "bedrock-accent";

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
  const [picker, setPicker] = useState<"icon" | "cover" | null>(null);
  const [toast, setToast] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newFolder, setNewFolder] = useState("Ideas");
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_KEY) || "system",
  );
  const [accent, setAccent] = useState(
    () => localStorage.getItem(ACCENT_KEY) || "violet",
  );
  const [newTag, setNewTag] = useState("");
  const [zoom, setZoom] = useState(1);
  const [now, setNow] = useState(Date.now());
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
    () => Number(localStorage.getItem("bedrock-fontsize")) || 16,
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
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
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
  }, [note?.title, view, note?.icon, note?.cover]);
  useEffect(() => {
    article.current?.scrollTo({ top: 0 });
    setPicker(null);
  }, [note?.id]);
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
      icon: "",
      cover: "",
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
    else {
      const n = create(
        title,
        "Daily notes",
        "## On my mind\n\n\n\n## A little gratitude\n\n\n\n## One thing for today\n\n- [ ] ",
      );
      saveNote({ ...n, icon: "📅" });
    }
  };
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", resolved === "dark" ? "#191919" : "#ffffff");
    };
    apply();
    localStorage.setItem(THEME_KEY, theme);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    localStorage.setItem(ACCENT_KEY, accent);
  }, [accent]);
  const isDark = () => document.documentElement.dataset.theme === "dark";
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
        setPicker(null);
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
  const unlinked = note
    ? live.filter(
        (n) =>
          n.id !== note.id &&
          !backlinks.some((b) => b.id === n.id) &&
          n.content.toLowerCase().includes(note.title.toLowerCase()),
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
    ? [...note.content.matchAll(/^(#{1,3}) (.+)$/gm)].map((m) => ({
        level: m[1].length,
        text: m[2],
      }))
    : [];
  const results = useMemo(
    () =>
      live
        .filter((n) =>
          (n.title + " " + n.content + " " + n.tags.join(" "))
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 14),
    [notes, query],
  );
  const recent = [...live].sort((a, b) => b.updatedAt - a.updatedAt);
  const commandActions = [
    {
      title: "Create new note",
      hint: "Ctrl N",
      icon: <FilePlus2 size={16} />,
      run: () => {
        setNewTitle("");
        setModal("new");
      },
    },
    {
      title: "Open quick switcher",
      hint: "Ctrl O",
      icon: <Search size={16} />,
      run: () => {
        setQuery("");
        setModal("search");
      },
    },
    {
      title: "Daily notes: Open today’s daily note",
      hint: "",
      icon: <CalendarDays size={16} />,
      run: () => {
        setModal(null);
        daily();
      },
    },
    {
      title: "Graph view: Open graph view",
      hint: "",
      icon: <Network size={16} />,
      run: () => {
        setView("graph");
        setModal(null);
      },
    },
    {
      title: "Open settings",
      hint: "",
      icon: <Settings size={16} />,
      run: () => setModal("settings"),
    },
    {
      title: "Toggle reading view",
      hint: "Ctrl E",
      icon: <BookOpen size={16} />,
      run: () => {
        setEditing((v) => !v);
        setModal(null);
      },
    },
    {
      title: "Toggle dark mode",
      hint: "",
      icon: <Moon size={16} />,
      run: () => {
        setTheme(isDark() ? "light" : "dark");
        setModal(null);
      },
    },
    {
      title: "Toggle left sidebar",
      hint: "",
      icon: <PanelLeft size={16} />,
      run: () => {
        toggleSidebar();
        setModal(null);
      },
    },
    {
      title: "Toggle right sidebar",
      hint: "",
      icon: <PanelRight size={16} />,
      run: () => {
        setRightPanel((v) => !v);
        setModal(null);
      },
    },
    {
      title: "Files: Show all notes",
      hint: "",
      icon: <Files size={16} />,
      run: () => {
        setView("collection");
        setFilter("All notes");
        setModal(null);
      },
    },
    {
      title: "Files: Import Markdown files",
      hint: "",
      icon: <Upload size={16} />,
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
  const showCollection = (next: string) => {
    setFilter(next);
    setView("collection");
    setSidebar(false);
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
  const formatLine = (prefix: string) => {
    const el = editor.current;
    if (!el) return;
    const start = note.content.lastIndexOf("\n", el.selectionStart - 1) + 1;
    update({
      content:
        note.content.slice(0, start) + prefix + note.content.slice(start),
    });
    const caret = el.selectionStart + prefix.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
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
      <Loader2 size={13} className="spin" />
    ) : syncStatus === "offline" ? (
      <WifiOff size={13} />
    ) : syncStatus === "synced" ? (
      <Cloud size={14} />
    ) : (
      <Check size={13} />
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
        icon: "",
        cover: "",
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
  const panelTitle =
    panelMode === "graph"
      ? "Local graph"
      : panelMode === "outline"
        ? "Outline"
        : panelMode === "backlinks"
          ? "Backlinks"
          : "Outgoing links";
  const renderNoteOptions = () =>
    note && (
      <div className="menu-anchor">
        <IconButton label="Note options" onClick={() => setMenu(!menu)}>
          <MoreHorizontal size={18} />
        </IconButton>
        {menu && (
          <>
            <div className="menu-scrim" onClick={() => setMenu(false)} />
            <div className="dropdown">
              <div className="dropdown-label">Page</div>
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
              <div className="dropdown-separator" />
              <button onClick={exportNote}>
                <ArrowDownToLine size={15} />
                Export Markdown
              </button>
              <button
                onClick={() => {
                  const copy = create(
                    note.title + " (copy)",
                    note.folder,
                    note.content,
                  );
                  saveNote({ ...copy, icon: note.icon, cover: note.cover });
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
              <div className="dropdown-separator" />
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
              <div className="dropdown-meta">
                {note.content.trim().split(/\s+/).filter(Boolean).length} words
                · Edited {editedLabel(note.updatedAt, now)}
              </div>
            </div>
          </>
        )}
      </div>
    );
  const sidebarRow = (n: Note, className: string) => (
    <button
      className={
        className +
        (note?.id === n.id && view === "note" ? " current" : "")
      }
      key={n.id}
      onClick={() => openNote(n.id)}
      title={n.title}
    >
      <NoteIcon note={n} size={15} />
      <span>{n.title}</span>
    </button>
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
        <div className="sidebar-top">
          <button
            className="vault-switch"
            title="Vault settings"
            onClick={() => setModal("settings")}
          >
            <BrandMark />
            <span className="vault-name">Bedrock</span>
            <ChevronsUpDown size={13} />
          </button>
          <IconButton label="Collapse sidebar" onClick={toggleSidebar}>
            <PanelLeft size={16} />
          </IconButton>
        </div>
        <nav className="sidebar-actions" aria-label="Workspace">
          <button
            className="nav-row"
            aria-label="Search notes"
            onClick={() => {
              setQuery("");
              setModal("search");
            }}
          >
            <Search size={16} />
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>
          <button
            className={
              "nav-row " +
              (view === "collection" && filter === "All notes" ? "active" : "")
            }
            aria-label="All notes"
            onClick={() => showCollection("All notes")}
          >
            <Home size={16} />
            <span>All notes</span>
            <small>{live.length}</small>
          </button>
          <button className="nav-row" aria-label="Daily note" onClick={daily}>
            <CalendarDays size={16} />
            <span>Daily note</span>
          </button>
          <button
            className={"nav-row " + (view === "graph" ? "active" : "")}
            aria-label="Graph view"
            onClick={() => {
              setView("graph");
              setSidebar(false);
            }}
          >
            <Network size={16} />
            <span>Graph view</span>
          </button>
          <button
            className="nav-row"
            aria-label="Import Markdown files"
            onClick={() => importer.current?.click()}
          >
            <Upload size={16} />
            <span>Import</span>
          </button>
        </nav>
        <div className="sidebar-header" role="tablist" aria-label="Sidebar">
          <IconButton
            label="Files"
            active={sidebarMode === "files"}
            onClick={() => setSidebarMode("files")}
          >
            <Files size={15} />
          </IconButton>
          <IconButton
            label="Find anything"
            active={sidebarMode === "search"}
            onClick={() => {
              setSidebarMode("search");
              setQuery("");
            }}
          >
            <Search size={15} />
          </IconButton>
          <IconButton
            label="Bookmarks"
            active={sidebarMode === "bookmarks"}
            onClick={() => setSidebarMode("bookmarks")}
          >
            <Bookmark size={15} />
          </IconButton>
          <IconButton
            label="Tags"
            active={sidebarMode === "tags"}
            onClick={() => setSidebarMode("tags")}
          >
            <Tags size={15} />
          </IconButton>
        </div>
        {sidebarMode === "search" && (
          <div className="sidebar-search">
            <Search size={14} />
            <input
              aria-label="Search your vault"
              autoFocus
              placeholder="Search notes…"
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
              {live.some((n) => n.starred) && (
                <div className="sidebar-section">
                  <div className="section-label">Bookmarked</div>
                  {live
                    .filter((n) => n.starred)
                    .map((n) => sidebarRow(n, "favorite-note"))}
                </div>
              )}
              <div className="sidebar-section">
                <div className="section-label with-tools">
                  <span>Folders</span>
                  <div className="sidebar-tools">
                    <IconButton
                      label="New note"
                      onClick={() => {
                        setNewTitle("");
                        setModal("new");
                      }}
                    >
                      <FilePlus2 size={14} />
                    </IconButton>
                    <IconButton
                      label="New folder"
                      onClick={() => {
                        setFolderDraft("");
                        setModal("folder");
                      }}
                    >
                      <FolderPlus size={14} />
                    </IconButton>
                    <IconButton
                      label="Sort files by name"
                      active={sortByName}
                      onClick={() => setSortByName((v) => !v)}
                    >
                      <ArrowDownAZ size={14} />
                    </IconButton>
                    <IconButton
                      label="Collapse all folders"
                      onClick={() =>
                        setCollapsed((c) =>
                          c.length === allFolders.length ? [] : allFolders,
                        )
                      }
                    >
                      <ChevronsUp size={14} />
                    </IconButton>
                  </div>
                </div>
                {allFolders.map((folder) => {
                  const items = live
                    .filter((n) => n.folder === folder)
                    .sort((a, b) =>
                      sortByName ? a.title.localeCompare(b.title) : 0,
                    );
                  const isCollapsed = collapsed.includes(folder);
                  return (
                    <div key={folder} className="folder-group">
                      <div className="folder-line">
                        <button
                          className="folder-row"
                          aria-expanded={!isCollapsed}
                          onClick={() =>
                            setCollapsed((c) =>
                              c.includes(folder)
                                ? c.filter((f) => f !== folder)
                                : [...c, folder],
                            )
                          }
                        >
                          <ChevronRight
                            size={13}
                            className={"folder-chevron" + (isCollapsed ? "" : " open")}
                          />
                          {isCollapsed ? (
                            <Folder size={15} className="folder-glyph" />
                          ) : (
                            <FolderOpen size={15} className="folder-glyph" />
                          )}
                          <span>{folder}</span>
                        </button>
                        <button
                          className="folder-add"
                          aria-label={"Add a note to " + folder}
                          title={"Add a note to " + folder}
                          onClick={() => {
                            setNewFolder(folder);
                            setNewTitle("");
                            setModal("new");
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {!isCollapsed && (
                        <div className="folder-children">
                          {items.map((n) => sidebarRow(n, "tree-note"))}
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
              </div>
            </>
          )}
          {sidebarMode === "search" && (
            <div className="quick-search-results">
              <div className="section-label">
                {results.length} matching {results.length === 1 ? "note" : "notes"}
              </div>
              {results.map((n) => (
                <button
                  className="search-result"
                  key={n.id}
                  onClick={() => openNote(n.id)}
                >
                  <span>
                    <NoteIcon note={n} size={14} />
                    {n.title}
                  </span>
                  <small>{plain(n.content).slice(0, 90)}</small>
                </button>
              ))}
              {!results.length && (
                <p className="detail-empty">No matches found.</p>
              )}
            </div>
          )}
          {sidebarMode === "bookmarks" && (
            <div className="sidebar-section">
              <div className="section-label">Bookmarks</div>
              {live
                .filter((n) => n.starred)
                .map((n) => sidebarRow(n, "sidebar-note"))}
              {!live.some((n) => n.starred) && (
                <p className="detail-empty">Bookmark a note from its menu.</p>
              )}
            </div>
          )}
          {sidebarMode === "tags" && (
            <div className="tag-list">
              <div className="section-label">Tags</div>
              {[...new Set(live.flatMap((n) => n.tags))].sort().map((tag) => (
                <button key={tag} onClick={() => showCollection("#" + tag)}>
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
        <div className="sidebar-footer">
          <button
            className="account-chip"
            title={syncLabel}
            onClick={() => setModal(user ? "settings" : "auth")}
          >
            <span className="avatar" aria-hidden="true">
              {(user?.name || "G").slice(0, 1).toUpperCase()}
            </span>
            <span className="account-text">
              <strong>{user ? user.name : "Guest vault"}</strong>
              <small>{user ? syncLabel : "Sign in to sync"}</small>
            </span>
          </button>
          <IconButton
            label="Sync"
            onClick={() => setModal(user ? "settings" : "auth")}
          >
            <Cloud size={15} />
          </IconButton>
          <IconButton label="Help" onClick={() => setModal("help")}>
            <CircleHelp size={15} />
          </IconButton>
          <IconButton label="Settings" onClick={() => setModal("settings")}>
            <Settings size={15} />
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
                      <NoteIcon note={n} size={14} />
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
              className="new-tab"
              onClick={() => {
                setNewTitle("");
                setModal("new");
              }}
            >
              <Plus size={15} />
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
                      <ArrowLeft size={15} />
                    </button>
                    <button
                      aria-label="Go forward"
                      title="Go forward"
                      disabled={
                        historyPosition.current >= history.current.length - 1
                      }
                      onClick={() => goHistory(1)}
                    >
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <nav className="doc-location" aria-label="Breadcrumb">
                    <button onClick={() => showCollection(note.folder)}>
                      <Folder size={13} />
                      {note.folder || "Vault"}
                    </button>
                    <ChevronRight size={12} />
                    <span className="doc-title-small">
                      <NoteIcon note={note} size={13} />
                      {note.title}
                    </span>
                  </nav>
                  <div className="document-actions">
                    <span className="edited-at">
                      Edited {editedLabel(note.updatedAt, now)}
                    </span>
                    <IconButton
                      label={note.starred ? "Remove bookmark" : "Bookmark note"}
                      active={note.starred}
                      className="star-toggle"
                      onClick={() => update({ starred: !note.starred })}
                    >
                      <Star size={15} fill={note.starred ? "currentColor" : "none"} />
                    </IconButton>
                    <button
                      className={"mode-toggle " + (editing ? "editing" : "")}
                      aria-label={editing ? "Read" : "Edit"}
                      title={editing ? "Reading view (⌘E)" : "Editing view (⌘E)"}
                      onClick={() => setEditing(!editing)}
                    >
                      {editing ? <BookOpen size={14} /> : <Pencil size={14} />}
                      <span>{editing ? "Read" : "Edit"}</span>
                    </button>
                    {renderNoteOptions()}
                  </div>
                </div>
                <article
                  ref={article}
                  className={"document-scroll" + (note.cover ? " has-cover" : "")}
                >
                  {note.cover && covers[note.cover] && (
                    <div className="page-cover" style={coverStyle(note.cover)}>
                      <div className="cover-actions">
                        <button onClick={() => setPicker("cover")}>
                          Change cover
                        </button>
                        <button onClick={() => update({ cover: "" })}>
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="document-content" key={note.id}>
                    <div className="page-head">
                      {note.icon && (
                        <button
                          className="page-icon"
                          aria-label="Change icon"
                          title="Change icon"
                          onClick={() => setPicker("icon")}
                        >
                          {note.icon}
                        </button>
                      )}
                      <div className="page-affordances">
                        {!note.icon && (
                          <button
                            onClick={() =>
                              update({
                                icon: emojis[
                                  Math.floor(Math.random() * emojis.length)
                                ],
                              })
                            }
                          >
                            <SmilePlus size={14} />
                            Add icon
                          </button>
                        )}
                        {!note.cover && (
                          <button
                            onClick={() =>
                              update({ cover: randomCover(note.cover) })
                            }
                          >
                            <ImagePlus size={14} />
                            Add cover
                          </button>
                        )}
                      </div>
                      {picker && (
                        <>
                          <div
                            className="menu-scrim"
                            onClick={() => setPicker(null)}
                          />
                          <div
                            className={"picker picker-" + picker}
                            role="dialog"
                            aria-label={
                              picker === "icon" ? "Choose an icon" : "Choose a cover"
                            }
                          >
                            <div className="picker-heading">
                              <span>
                                {picker === "icon" ? "Icon" : "Cover gallery"}
                              </span>
                              <button
                                onClick={() => {
                                  update(
                                    picker === "icon"
                                      ? { icon: "" }
                                      : { cover: "" },
                                  );
                                  setPicker(null);
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            {picker === "icon" ? (
                              <div className="emoji-grid">
                                {emojis.map((emoji) => (
                                  <button
                                    key={emoji}
                                    aria-label={"Use " + emoji}
                                    className={
                                      note.icon === emoji ? "selected" : ""
                                    }
                                    onClick={() => {
                                      update({ icon: emoji });
                                      setPicker(null);
                                    }}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="cover-grid">
                                {coverKeys.map((key) => (
                                  <button
                                    key={key}
                                    aria-label={covers[key].label + " cover"}
                                    className={
                                      note.cover === key ? "selected" : ""
                                    }
                                    style={coverStyle(key)}
                                    onClick={() => {
                                      update({ cover: key });
                                      setPicker(null);
                                    }}
                                  >
                                    <span>{covers[key].label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {picker === "cover" && (
                              <button
                                className="picker-shuffle"
                                onClick={() =>
                                  update({ cover: randomCover(note.cover) })
                                }
                              >
                                <Shuffle size={13} /> Surprise me
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <textarea
                      ref={titleInput}
                      className="note-title"
                      aria-label="Note title"
                      maxLength={300}
                      value={note.title}
                      rows={1}
                      placeholder="Untitled"
                      onChange={(e) => update({ title: e.target.value })}
                      onBlur={() => {
                        if (!note.title.trim())
                          update({ title: "Untitled note" });
                      }}
                    />
                    <div className="properties" aria-label="Properties">
                      <div className="property">
                        <span className="property-name">
                          <FolderOpen size={14} />
                          Folder
                        </span>
                        <span className="property-value">
                          <select
                            aria-label="Folder"
                            className="folder-select"
                            value={note.folder}
                            onChange={(e) => update({ folder: e.target.value })}
                          >
                            {allFolders.map((f) => (
                              <option key={f}>{f}</option>
                            ))}
                          </select>
                        </span>
                      </div>
                      <div className="property">
                        <span className="property-name">
                          <Hash size={14} />
                          Tags
                        </span>
                        <div className="property-value note-tags">
                          {note.tags.map((tag) => (
                            <span className="tag-chip" key={tag}>
                              <button onClick={() => showCollection("#" + tag)}>
                                <span>#</span>
                                {tag}
                              </button>
                              <button
                                className="tag-remove"
                                aria-label={"Remove tag " + tag}
                                onClick={() =>
                                  update({
                                    tags: note.tags.filter((t) => t !== tag),
                                  })
                                }
                              >
                                <X size={11} />
                              </button>
                            </span>
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
                      </div>
                      <div className="property">
                        <span className="property-name">
                          <Clock3 size={14} />
                          Updated
                        </span>
                        <span className="property-value muted">
                          {editedLabel(note.updatedAt, now)}
                        </span>
                      </div>
                      <div className="property">
                        <span className="property-name">
                          <Link2 size={14} />
                          Linked from
                        </span>
                        <span className="property-value">
                          {backlinks.length ? (
                            backlinks.slice(0, 3).map((n) => (
                              <button
                                key={n.id}
                                className="mention-chip"
                                onClick={() => openNote(n.id)}
                              >
                                <NoteIcon note={n} size={12} />
                                {n.title}
                              </button>
                            ))
                          ) : (
                            <span className="muted">No backlinks yet</span>
                          )}
                          {backlinks.length > 3 && (
                            <button
                              className="mention-more"
                              onClick={() => openDetails("backlinks")}
                            >
                              +{backlinks.length - 3}
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                    {editing ? (
                      <div className="markdown-editor">
                        <div
                          className="format-bar"
                          role="toolbar"
                          aria-label="Formatting"
                        >
                          <IconButton label="Bold" onClick={() => format("**", "**")}>
                            <Bold size={15} />
                          </IconButton>
                          <IconButton label="Italic" onClick={() => format("*", "*")}>
                            <Italic size={15} />
                          </IconButton>
                          <IconButton label="Heading" onClick={() => formatLine("## ")}>
                            <Heading2 size={15} />
                          </IconButton>
                          <IconButton label="Quote" onClick={() => formatLine("> ")}>
                            <Quote size={15} />
                          </IconButton>
                          <IconButton label="Task" onClick={() => formatLine("- [ ] ")}>
                            <ListTodo size={15} />
                          </IconButton>
                          <IconButton label="Inline code" onClick={() => format("`", "`")}>
                            <Code size={15} />
                          </IconButton>
                          <span className="format-divider" />
                          <IconButton label="Link a note" onClick={() => format("[[", "]]")}>
                            <Link2 size={15} />
                          </IconButton>
                        </div>
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
                          placeholder="Start writing, or type [[ to link another note…"
                        />
                        <div className="editor-hint">
                          <span>
                            <Sparkles size={12} /> Markdown supported · link
                            ideas with [[note title]]
                          </span>
                          <kbd>⌘E to read</kbd>
                        </div>
                      </div>
                    ) : note.content.trim() ? (
                      <div
                        className="prose"
                        onDoubleClick={(e) => {
                          if (!(e.target as HTMLElement).closest("button,a"))
                            setEditing(true);
                        }}
                      >
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
                    ) : (
                      <div className="empty-page">
                        <p>This page is waiting for its first thought.</p>
                        <div className="starter-chips">
                          <button onClick={() => setEditing(true)}>
                            <Pencil size={14} /> Start writing
                          </button>
                          <button
                            onClick={() => {
                              update({ content: "- [ ] " });
                              setEditing(true);
                            }}
                          >
                            <ListTodo size={14} /> Checklist
                          </button>
                          <button
                            onClick={() => {
                              update({
                                content:
                                  "## Context\n\n\n## Ideas\n\n- \n\n## Next steps\n\n- [ ] ",
                              });
                              setEditing(true);
                            }}
                          >
                            <List size={14} /> Outline
                          </button>
                          <button
                            onClick={() => {
                              update({
                                content: `Related to [[${live.find((n) => n.id !== note.id)?.title || "Another note"}]]`,
                              });
                              setEditing(true);
                            }}
                          >
                            <Link2 size={14} /> Linked note
                          </button>
                        </div>
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
                    <span>{panelTitle}</span>
                    <IconButton
                      label="Close details panel"
                      onClick={() => setMobilePanel(false)}
                    >
                      <X size={18} />
                    </IconButton>
                  </div>
                  <div className="panel-tools" role="tablist">
                    <IconButton
                      label="Local graph"
                      active={panelMode === "graph"}
                      onClick={() => setPanelMode("graph")}
                    >
                      <GitBranch size={15} />
                    </IconButton>
                    <IconButton
                      label="Outline"
                      active={panelMode === "outline"}
                      onClick={() => setPanelMode("outline")}
                    >
                      <List size={15} />
                    </IconButton>
                    <IconButton
                      label="Backlinks"
                      active={panelMode === "backlinks"}
                      onClick={() => setPanelMode("backlinks")}
                    >
                      <Link2 size={15} />
                    </IconButton>
                    <IconButton
                      label="Outgoing links"
                      active={panelMode === "links"}
                      onClick={() => setPanelMode("links")}
                    >
                      <ArrowUpRight size={15} />
                    </IconButton>
                    <IconButton
                      label="Expand graph"
                      className="panel-expand"
                      onClick={() => setView("graph")}
                    >
                      <Maximize2 size={14} />
                    </IconButton>
                  </div>
                  <div className="panel-title">{panelTitle}</div>
                  {panelMode === "graph" ? (
                    <div className="panel-content graph-panel">
                      <div className="local-graph-view">
                        <Graph
                          notes={localGraphNotes}
                          activeId={note.id}
                          onSelect={openNote}
                          showLabels={false}
                        />
                      </div>
                      <div className="graph-facts">
                        <button onClick={() => setPanelMode("backlinks")}>
                          <strong>{backlinks.length}</strong>
                          <span>
                            {backlinks.length === 1 ? "backlink" : "backlinks"}
                          </span>
                        </button>
                        <button onClick={() => setPanelMode("links")}>
                          <strong>{links.length}</strong>
                          <span>outgoing</span>
                        </button>
                        <button onClick={() => setPanelMode("outline")}>
                          <strong>{headings.length}</strong>
                          <span>
                            {headings.length === 1 ? "heading" : "headings"}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="panel-content">
                      {panelMode === "outline" && (
                        <>
                          {headings.length ? (
                            headings.map((h, i) => (
                              <button
                                key={h.text + i}
                                className={"outline-item level-" + h.level}
                                onClick={() => {
                                  setEditing(false);
                                  setTimeout(
                                    () =>
                                      document
                                        .getElementById(
                                          "heading-" +
                                            h.text.replace(/\W+/g, "-"),
                                        )
                                        ?.scrollIntoView({
                                          block: "start",
                                          behavior: "smooth",
                                        }),
                                    20,
                                  );
                                }}
                              >
                                {h.text}
                              </button>
                            ))
                          ) : (
                            <p className="detail-empty">
                              Add headings with ## to build an outline.
                            </p>
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
                                <strong>
                                  <NoteIcon note={n} size={13} />
                                  {n.title}
                                </strong>
                                <p>
                                  {plain(
                                    n.content
                                      .split("\n")
                                      .filter(Boolean)
                                      .find((line) =>
                                        line
                                          .toLowerCase()
                                          .includes(note.title.toLowerCase()),
                                      ) || n.content.slice(0, 100),
                                  )}
                                </p>
                              </button>
                            ))
                          ) : (
                            <p className="detail-empty">No backlinks found.</p>
                          )}
                          <h3 className="unlinked-heading">
                            Unlinked mentions{" "}
                            <span className="count-badge">
                              {unlinked.length}
                            </span>
                          </h3>
                          {unlinked.map((n) => (
                            <button
                              className="sidebar-note"
                              key={n.id}
                              onClick={() => openNote(n.id)}
                            >
                              <NoteIcon note={n} size={14} />
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
                          {links.map((title, i) => {
                            const target = live.find(
                              (x) => x.title.toLowerCase() === title.toLowerCase(),
                            );
                            return (
                              <button
                                className={
                                  "outline-item link-item" +
                                  (target ? "" : " unresolved")
                                }
                                key={title + i}
                                onClick={() => inlineLink(title)}
                              >
                                {target ? (
                                  <NoteIcon note={target} size={14} />
                                ) : (
                                  <FileText size={14} />
                                )}
                                {title}
                              </button>
                            );
                          })}
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
                  <span className="eyebrow">
                    <Sparkles size={13} /> Your knowledge, connected
                  </span>
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
                  <span className="eyebrow">
                    {filter === "All notes" ? (
                      <>
                        <Sparkles size={13} />
                        {greeting()}
                        {user ? `, ${user.name.split(" ")[0]}` : ""}
                      </>
                    ) : filter.startsWith("#") ? (
                      <>
                        <Hash size={13} /> Tag
                      </>
                    ) : filter === "Trash" || filter === "Starred" ? (
                      <>
                        <Files size={13} /> Library
                      </>
                    ) : (
                      <>
                        <Folder size={13} /> Folder
                      </>
                    )}
                  </span>
                  <h1>{filter}</h1>
                  <p>
                    {filter === "Trash"
                      ? "Deleted notes can be restored here."
                      : `${listed.length} ${listed.length === 1 ? "note" : "notes"}`}
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    setNewTitle("");
                    if (allFolders.includes(filter)) setNewFolder(filter);
                    setModal("new");
                  }}
                >
                  <Plus size={15} /> New note
                </button>
              </div>
              {filter === "All notes" && recent.length > 0 && (
                <div className="recent-strip">
                  <div className="section-label">
                    <Clock3 size={13} /> Jump back in
                  </div>
                  <div className="recent-row">
                    {recent.slice(0, 4).map((n) => (
                      <button
                        key={n.id}
                        className="recent-card"
                        onClick={() => openNote(n.id)}
                      >
                        <span
                          className={"recent-cover" + (n.cover ? "" : " plain")}
                          style={coverStyle(n.cover)}
                        />
                        <span className="recent-icon">
                          <NoteIcon note={n} size={18} />
                        </span>
                        <strong>{n.title}</strong>
                        <small>{editedLabel(n.updatedAt, now)}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                      className={"note-card" + (n.deleted ? " deleted" : "")}
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
                      <span
                        className={"note-card-cover" + (n.cover ? "" : " plain")}
                        style={coverStyle(n.cover)}
                      />
                      <div className="note-card-body">
                        <div className="note-card-top">
                          <span className="note-card-icon">
                            <NoteIcon note={n} size={18} />
                          </span>
                          {n.starred && <Star size={14} fill="currentColor" />}
                        </div>
                        <h3>{n.title}</h3>
                        <p>{plain(n.content).slice(0, 145) || "Empty note"}</p>
                        <div className="note-card-meta">
                          <span>
                            {n.deleted ? "Click to restore" : n.folder}
                          </span>
                          <small>{dateFormat.format(n.updatedAt)}</small>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
              {!listed.length && (
                <div className="empty-state">
                  <span className="empty-orb">
                    <BookOpen size={26} />
                  </span>
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
            {note && view === "note" && (
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
            <button
              className="theme-flip"
              aria-label="Switch color scheme"
              title="Switch color scheme"
              onClick={() => setTheme(isDark() ? "light" : "dark")}
            >
              <Sun size={13} className="sun" />
              <Moon size={13} className="moon" />
            </button>
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
            className="mobile-create"
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
          <Check size={15} />
          {toast}
        </div>
      )}
      {modal === "search" && (
        <Modal
          title="Quick switcher"
          onClose={() => setModal(null)}
          wide
          className="palette"
        >
          <div className="command-input">
            <Search size={18} />
            <input
              aria-label="Search your vault"
              autoFocus
              placeholder="Search or jump to a note…"
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
              {query ? "Matching notes" : "Recently edited"}
            </div>
            {results.map((n, i) => (
              <button
                className={selection === i ? "is-selected" : ""}
                onMouseEnter={() => setSelection(i)}
                key={n.id}
                onClick={() => openNote(n.id)}
              >
                <span className="result-icon">
                  <NoteIcon note={n} size={16} />
                </span>
                <span>
                  <strong>{n.title}</strong>
                  <small>
                    {n.folder} · {editedLabel(n.updatedAt, now)}
                  </small>
                </span>
                <ArrowUpRight size={14} className="result-go" />
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
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> navigate <kbd>↵</kbd> open
            </span>
          </div>
        </Modal>
      )}
      {modal === "commands" && (
        <Modal
          title="Command palette"
          onClose={() => setModal(null)}
          wide
          className="palette"
        >
          <div className="command-input">
            <Terminal size={17} />
            <input
              aria-label="Search commands"
              autoFocus
              placeholder="Type a command…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) =>
                navigateResults(e, commandActions.length, () =>
                  commandActions[Math.max(0, selection)].run(),
                )
              }
            />
            <kbd>esc</kbd>
          </div>
          <div className="command-results">
            <div className="command-label">Commands</div>
            {commandActions.map((command, i) => (
              <button
                className={i === selection ? "is-selected" : ""}
                key={command.title}
                onMouseEnter={() => setSelection(i)}
                onClick={command.run}
              >
                <span className="result-icon">{command.icon}</span>
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
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> navigate <kbd>↵</kbd> run <kbd>esc</kbd> dismiss
            </span>
          </div>
        </Modal>
      )}
      {modal === "new" && (
        <Modal title="New note" onClose={() => setModal(null)}>
          <p className="modal-subtitle">
            Give your thought a name and a home.
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
          className="auth-dialog"
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          <div className="auth-symbol">
            <BrandMark large />
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
            accent={accent}
            onAccent={setAccent}
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
              ["Open quick switcher", "⌘ / Ctrl K"],
              ["Command palette", "⌘ / Ctrl P"],
              ["Create a note", "⌘ / Ctrl N"],
              ["Edit / read a note", "⌘ / Ctrl E"],
              ["Bold / italic", "⌘ / Ctrl B · I"],
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
