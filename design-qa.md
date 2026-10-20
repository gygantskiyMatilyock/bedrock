# Bedrock interface QA

Status: **passed** — October 20, 2026.

## Direction

"Craft × Notion, as simple as Obsidian." Craft supplies the shell: each note is a rounded paper card floating on a soft canvas, with the sidebar and info panel sitting borderless beside it, pill tabs, and a choice of page fonts. Notion supplies the ink and type scale. Obsidian supplies the reading column, violet links, backlinks, outline, graph, and the plain-Markdown editor.

## Reference evidence

Observed with the method from [REA](https://github.com/morluto/rea)'s `reverse-engineer-anything` skill (observe the live page, record evidence, rebuild from it). REA's own CLI was not run in this environment, so the observation used the project's Playwright to capture screenshots and computed styles from public pages:

| Source | Measured | Used as |
| --- | --- | --- |
| Notion public page (notion.site) | Ink `rgb(44 44 43)`; sidebar `rgb(249 248 247)`; nav rows 30 px, 6 px radius, `rgb(95 94 89)`; H1 40/48 700; heading blocks 30 px and 24 px at 600; body 16/24 | `--text`, `--muted`, sidebar row metrics, heading scale |
| Obsidian Publish (obsidian.md/help) | 704 px reading column; internal links `rgb(138 92 245)` at weight 600; H1 41.6 px, −0.624 px tracking; H2 weight 680 with a rule below; callouts 4 px radius, 12/12/12/24 padding | `--page-width`, `--accent`, wiki-link weight, H2 rule |
| Craft (Mobbin web screens) | Paper card on canvas, borderless side panels, segmented sidebar switcher, outline and info panels, page styles | App shell, `--shadow-paper`, Sans/Serif/Mono page fonts |

Captures were kept out of the repository; the values above are the record.

## Design system

| Element | Result |
| --- | --- |
| Shell | Canvas `#f3f2ef` (dark `#131313`); paper card `#ffffff` (dark `#1c1c1c`), 14 px radius, soft paper shadow; no borders or status bar |
| Type | Inter Variable for the interface; page fonts Sans (Inter), Serif (Newsreader Variable), or Mono; the font-size setting applies exactly in every style |
| Page | Optional emoji icon and gradient cover, a single meta line (folder, tags, backlinks), 704 px column |
| Editor | Plain Markdown with tinted syntax: markers dimmed, headings and bold emphasized, links, tags and code colored; layers verified to overlap pixel for pixel |
| Accent | Obsidian violet `#8a5cf5` by default; blue, green, amber, rose selectable |
| Sidebar | Workspace switcher, four navigation rows, segmented Files/Search/Bookmarks/Tags, bookmarked section, folder tree; account and sync status in the footer |
| Details | Local graph, outline, backlinks, and outgoing links as white cards on the canvas; becomes a slide-over below 1100 px |
| Phone | Full-bleed page, blurred top bar, floating bottom navigation, drawer sidebar |

## Verification

- `tsc -b` and the production build pass.
- `bun test tests/backend.test.ts`: 6 pass, including icon/cover storage and cover validation.
- Playwright: 9 pass, covering account sync, offline reopening, multi-device sync and conflicts, note CRUD, folders/bookmarks/tags/outline/links, icons/covers/folder persistence, settings (theme, accent, page font, editor), and the phone layout.
- Desktop (1440 × 900, 1280 × 800) and phone (390 × 844) captures were reviewed in light and dark themes with no runtime errors or horizontal overflow.

The server migrates existing databases by adding `icon` and `cover` columns on start. The theme preference moved to a new storage key with "Adapt to system" as the default.
