# Bedrock interface QA

Status: **passed** — October 20, 2026.

## Reference and scope

The reference is the desktop app preview on [obsidian.md](https://obsidian.md/), supplemented by the official [workspace](https://obsidian.md/help/workspace) and [mobile](https://obsidian.md/help/mobile) documentation. This update implements that workspace in the existing Bedrock web app.

Reference captures and computed styles were collected before implementation. Local captures are in the ignored `artifacts/reference/` directory, including `obsidian-app.png` (963 × 589) and `obsidian-design-spec.md`.

## Visual review

Compared the reference with Bedrock at 963 × 590 and reviewed the working app at 1440 × 1000 and 390 × 844.

| Element | Result |
| --- | --- |
| Workspace surfaces | Charcoal editor `#1e1e1e`, sidebar `#262626`, borders `#363636` |
| File explorer | 200 px desktop pane, compact text rows, subdued icons, plain selection |
| Tabs | 38 px strip, flat inactive tabs, editor-colored active tab |
| Typography | System sans, 28 px desktop title, 14 px default body, 20 px second-level headings |
| Editor spacing | 28 px horizontal desktop inset; user-controlled readable line length |
| Links and tags | Purple inline links and translucent purple tag pills |
| Graph | Gray nodes and edges, white current note, purple hover; labels on hover in local graph |
| Settings | Navigation column and plain settings rows; dark and light themes |
| Phone | Single top toolbar, bottom navigation, file drawer, details drawer |
| Motion | Short panel/dialog transitions, immediate keyboard interactions, reduced-motion support |

No horizontal overflow or browser runtime errors appeared in the inspected desktop and mobile captures. Settings dialogs were checked after transitions completed.

The app retains Bedrock branding and existing note content. Graph topology comes from actual notes. Functional file and editor toolbars add controls omitted from the static website preview. Native operating-system window buttons are omitted. These differences mean this is a faithful interface recreation, not a pixel-identical image or the official Obsidian application.

## Interaction verification

Production build and TypeScript checks pass. The eight browser tests pass:

- Account creation, private vault sync acknowledgement, and sign-out.
- Offline editing and reopening the real cached app.
- Sync between independent browser sessions, offline queues, conflict copies, and logout isolation.
- Saving another edit while a preceding save is in flight.
- Note creation, editing, wiki links, search, deletion, restoration, and graph navigation.
- Folders, bookmarks, tags, outline, backlinks, and outgoing links.
- Command palette keyboard operation and persisted appearance/editor preferences.
- Mobile navigation, backlinks drawer, note duplication, and the sign-in route.

Final UI regression checks were repeated after fixing the mobile note menu, narrow-screen details drawer, and Settings → Sync sign-in mode. The Read/Edit control has an explicit accessible name. Graph nodes support keyboard activation; forms and dialogs retain labels and focus handling.

The backend and sync implementation were preserved. This update does not add Obsidian plugin compatibility or other unimplemented product features.
