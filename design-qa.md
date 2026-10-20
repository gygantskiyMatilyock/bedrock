# Bedrock interface QA

Status: **passed** — October 20, 2026.

## Direction

"Obsidian × Notion": Notion's warm paper surfaces, page icons, gradient covers, properties, and gallery home, kept together with Obsidian's tabs, wiki links, backlinks, outline, local graph, and command palette. References were collected from Mobbin (Notion, Craft, Lightfield, hilos, v0, Navattic); links are in the README.

## Design system

| Element | Result |
| --- | --- |
| Type | Inter Variable (bundled, works offline), 40 px page titles, 16 px body at 1.72 line height |
| Light theme | White page `#ffffff`, warm sidebar `#f8f7f4`, text `#2f2d29`, hairline borders at 9% ink |
| Dark theme | Page `#191919`, sidebar `#1f1f1f`, raised `#252525` |
| Accent | Violet `#7c5cff` by default; blue, green, amber, and rose selectable in Settings → Appearance |
| Pages | Optional emoji icon and gradient cover (8 presets), hover "Add icon / Add cover", properties block |
| Sidebar | Workspace switcher, labeled navigation, segmented Files/Search/Bookmarks/Tags control, bookmarked section, folder tree with guide lines and per-folder add |
| Tabs | Soft browser-style tabs; the active tab joins the page surface |
| Home | Greeting, "Jump back in" recent cards, gallery cards with covers and icons |
| Palette | Borderless search header, icon tiles, grouped results, keyboard legend footer |
| Graph | Theme-aware nodes and edges with an accent-glow active node |
| Phone | Blurred top bar, floating bottom navigation with a gradient create button, drawer sidebar, full-height details sheet |

## Verification

- `tsc -b` and the production build pass.
- `bun test tests/backend.test.ts`: 6 pass, including icon/cover storage and cover validation.
- Playwright: 9 pass, covering account sync, offline reopening, multi-device sync and conflicts, note CRUD, folders/bookmarks/tags/outline/links, icons/covers/folder property persistence, settings (theme, accent, editor), and the phone layout.
- Desktop (1440 × 900, 1280 × 800) and phone (390 × 844) captures were reviewed in light and dark themes with no runtime errors or horizontal overflow.

The server migrates existing databases by adding `icon` and `cover` columns on start. The theme preference moved to a new storage key with "Adapt to system" as the default.
