# Bedrock

A calm, Obsidian-inspired web workspace for connected notes. Built with React, TypeScript, Vite, Bun, and SQLite.

## Features

- Markdown editing and preview, wiki links, backlinks, outline, and an interactive graph
- Private accounts with automatic sync across devices, offline caching, and conflict copies
- Notes, folders, tags, stars, daily notes, search, tabs, focus mode, and trash/restore
- Markdown import and export, vault JSON export, light and dark themes
- Responsive layout, keyboard shortcuts, reduced-motion support

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
npx playwright test tests/sync.spec.ts
```

The browser sync tests require a running backend on port 3000 and installed Chromium (`npx playwright install chromium`).

## Deploy

Railway builds the Dockerfile and checks `/api/health`. Attach a persistent volume at `/data`; `DB_PATH` defaults to `/data/bedrock.sqlite`. Run a single app replica because SQLite uses a local persistent volume. The repository's `work` branch is deployed to the Bedrock Railway service.

## Sync behavior

Guest notes stay in this browser. Creating an account imports current guest notes into a private vault. Signing in retrieves that account's notes. Edits sync after a short debounce; other devices poll every five seconds. Concurrent conflicts retain the remote note and create a local conflict copy. Account caches remain on the device for offline use and are separated from guest data.

Passwords are Argon2id-hashed and sessions use HTTPOnly cookies. Password recovery and end-to-end encryption are not implemented. This initial web version does not implement Obsidian plugins, canvas files, attachment uploads, or simultaneous collaborative editing. The app is independently branded and uses no Obsidian source code or assets.

## Design references

- [Emil Kowalski's design-engineering skill](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md)
- [Evernote editor on Mobbin](https://mobbin.com/screens/d9b96113-1f32-486d-9235-23ed5551de6b)
- [mymind editor on Mobbin](https://mobbin.com/screens/4df2e914-3742-4b59-bda4-a52ed23ee990)

Motion is intentionally restrained, with immediate keyboard interactions and reduced-motion overrides.
