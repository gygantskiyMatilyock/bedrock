import React from "react";
import { createRoot } from "react-dom/client";
import { useVault } from "../src/useVault";
import type { Note } from "../src/types";
const seed: Note[] = [
  {
    id: "sync-seed",
    title: "Welcome",
    content: "Guest note",
    folder: "Notes",
    tags: [],
    starred: false,
    updatedAt: Date.now(),
    version: 0,
    deleted: false,
  },
];
function Harness() {
  const vault = useVault(seed);
  (window as unknown as { vault: typeof vault }).vault = vault;
  return <main>Sync test harness</main>;
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Harness />
  </React.StrictMode>,
);
