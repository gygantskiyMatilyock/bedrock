# Bedrock

A calm workspace for connected notes: Craft's paper-on-canvas layout and page fonts, Notion's type and page icons and covers, and Obsidian's simplicity and linked thinking (plain Markdown, wiki links, backlinks, outline, and a graph beside the editor). Built with React, TypeScript, Vite, Bun, and SQLite.

## Features

- Markdown editing and preview with a formatting toolbar, wiki links, backlinks, outline, and an interactive graph
- Page icons, gradient covers, and a one-line meta row (folder, tags, backlinks) on every note
- Sans, Serif, and Mono page fonts; tinted Markdown source editing
- Private accounts with automatic sync across devices, offline caching, and conflict copies
- Notes, folders, tags, stars, daily notes, search, tabs, focus mode, and trash/restore
- Markdown import and export, vault JSON export, system/light/dark themes and five accent colors
- Responsive layout, quick switcher, command palette, reduced-motion support
- Settings for theme, editor font size, spellcheck, and readable line length

## Run

```sh
npm ci
npm run build
DB_PATH=./bedrock.sqlite npm start
```

`npm start` requires Bun. For Vite development, run the backend on port 3000 and `npm run dev` separately. The Vite server proxies `/api` to the backend.

## Validate

```sh
npx bun test tests/backend.test.ts
npm run test:e2e
```

The browser tests require a running backend on port 3000 and installed Chromium (`npx playwright install chromium`). Set `BEDROCK_TEST_URL` to test a deployed environment.

## Deploy

Railway builds the Dockerfile and checks `/api/health`. Attach a persistent volume at `/data`; `DB_PATH` defaults to `/data/bedrock.sqlite`. Run a single app replica because SQLite uses a local persistent volume. The repository's `work` branch is deployed to the Bedrock Railway service.

## Sync behavior

Guest notes stay in this browser. Creating an account imports current guest notes into a private vault. Signing in retrieves that account's notes. Edits sync after a short debounce; other devices poll every five seconds. Concurrent conflicts retain the remote note and create a local conflict copy. Account caches remain on the device for offline use and are separated from guest data.

Passwords are Argon2id-hashed and sessions use HTTPOnly cookies. Password recovery and end-to-end encryption are not implemented. This initial web version does not implement Obsidian plugins, canvas files, attachment uploads, or simultaneous collaborative editing. The app is independently branded and uses no Obsidian source code or assets.

## Design references

- [Obsidian's official app preview](https://obsidian.md/) supplies the current workspace layout, dimensions, colors, typography, tabs, and graph styling.
- [Obsidian workspace documentation](https://obsidian.md/help/workspace) and [mobile documentation](https://obsidian.md/help/mobile) inform navigation.
- [Emil Kowalski's design-engineering skill](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md) informs interaction and motion.

The current interface blends Obsidian with Notion. Notion screens on Mobbin ([page editor](https://mobbin.com/screens/a7c67122-92ad-48b5-aae6-38c53b3edf8b), [cover and icon](https://mobbin.com/screens/4acb3a13-ddf8-4b60-9eae-e6ade2cc4dd3), [slash menu](https://mobbin.com/screens/5840d7b8-6098-4288-a55f-02f4232fd051)) informed the warm sidebar, page header, covers, and icons. [Lightfield](https://mobbin.com/screens/7438b199-644d-4370-b6fe-8e860addf330) and [Craft](https://mobbin.com/screens/8bc2c4e6-34cd-4478-900c-b0c0c8f8da3f) informed the properties block, and [v0](https://mobbin.com/screens/5f353fc3-d9ce-4d1c-be9b-cc1b4ad07578) and [Navattic](https://mobbin.com/screens/c65971cf-c4ea-45e9-99a5-555930cb5d73) informed the command palette. Motion is restrained, with immediate keyboard interactions and reduced-motion overrides. Craft's shell comes from its Mobbin screens ([document](https://mobbin.com/screens/d649ea8f-e16d-496b-a158-9df375a18c49), [info panel](https://mobbin.com/screens/fefd374e-6b6f-42af-9f48-ddc49977d43b)). Notion and Obsidian type and color values were measured from live public pages following [REA](https://github.com/morluto/rea)'s observation method. See `design-qa.md` for the measurements and validation.
