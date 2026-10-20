import { useState } from "react";
import type { ReactNode } from "react";
import type { User } from "./types";

type Section = "editor" | "files" | "appearance" | "hotkeys" | "sync" | "about";

type SettingsPanelProps = {
  theme: string;
  onTheme: (value: string) => void;
  accent: string;
  onAccent: (value: string) => void;
  user: User | null;
  syncLabel: string;
  onSignIn: () => void;
  onLogout: () => Promise<void>;
  onImport: () => void;
  onExport: () => void;
  onHelp: () => void;
  readableWidth: boolean;
  onReadableWidth: (value: boolean) => void;
  fontSize: number;
  onFontSize: (value: number) => void;
  spellcheck: boolean;
  onSpellcheck: (value: boolean) => void;
};

const accents = [
  { id: "violet", label: "Violet", color: "#7c5cff" },
  { id: "blue", label: "Blue", color: "#2f80ed" },
  { id: "green", label: "Green", color: "#16a34a" },
  { id: "amber", label: "Amber", color: "#e8890c" },
  { id: "rose", label: "Rose", color: "#e5487b" },
];

function SettingRow({
  name,
  description,
  control,
  labelFor,
  labelId,
}: {
  name: string;
  description?: string;
  control: ReactNode;
  labelFor?: string;
  labelId?: string;
}) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        {labelFor ? (
          <label htmlFor={labelFor} id={labelId}>
            {name}
          </label>
        ) : (
          <div className="setting-name" id={labelId}>
            {name}
          </div>
        )}
        {description && <p>{description}</p>}
      </div>
      <div className="setting-control">{control}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  labelId,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  labelId: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      className={`toggle-switch${checked ? " on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export default function SettingsPanel({
  theme,
  onTheme,
  accent,
  onAccent,
  user,
  syncLabel,
  onSignIn,
  onLogout,
  onImport,
  onExport,
  onHelp,
  readableWidth,
  onReadableWidth,
  fontSize,
  onFontSize,
  spellcheck,
  onSpellcheck,
}: SettingsPanelProps) {
  const [section, setSection] = useState<Section>("appearance");
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const groups: {
    label: string;
    items: { id: Section; label: string }[];
  }[] = [
    {
      label: "Options",
      items: [
        { id: "editor", label: "Editor" },
        { id: "files", label: "Files and links" },
        { id: "appearance", label: "Appearance" },
        { id: "hotkeys", label: "Hotkeys" },
      ],
    },
    {
      label: "Bedrock",
      items: [
        { id: "sync", label: "Sync" },
        { id: "about", label: "About" },
      ],
    },
  ];
  const activeTitle = groups
    .flatMap((group) => group.items)
    .find((item) => item.id === section)?.label;

  return (
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings categories">
        {groups.map((group) => (
          <div className="settings-nav-group" key={group.label}>
            <div className="settings-nav-heading">{group.label}</div>
            {group.items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={section === item.id ? "active" : ""}
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <section
        className="settings-content"
        aria-labelledby="settings-panel-heading"
      >
        <h2 className="settings-heading" id="settings-panel-heading">
          {activeTitle}
        </h2>

        {section === "appearance" && (
          <>
            <SettingRow
              name="Base color scheme"
              description="Choose the color scheme for the application."
              labelFor="settings-color-scheme"
              control={
                <select
                  id="settings-color-scheme"
                  value={theme}
                  onChange={(event) => onTheme(event.target.value)}
                >
                  <option value="system">Adapt to system</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              }
            />
            <SettingRow
              name="Accent color"
              description="Used for links, tags, selection, and the graph."
              labelId="settings-accent-label"
              control={
                <div
                  className="accent-options"
                  role="radiogroup"
                  aria-labelledby="settings-accent-label"
                >
                  {accents.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      role="radio"
                      aria-checked={accent === option.id}
                      aria-label={option.label}
                      title={option.label}
                      className={
                        "settings-accent-swatch" +
                        (accent === option.id ? " selected" : "")
                      }
                      style={{ backgroundColor: option.color }}
                      onClick={() => onAccent(option.id)}
                    />
                  ))}
                </div>
              }
            />
            <SettingRow
              name="Readable line length"
              description="Limit the maximum width of the editor to make long notes easier to read."
              labelId="appearance-readable-width-label"
              control={
                <Toggle
                  checked={readableWidth}
                  onChange={onReadableWidth}
                  labelId="appearance-readable-width-label"
                />
              }
            />
            <p className="settings-note">
              Appearance preferences are saved on this device.
            </p>
          </>
        )}

        {section === "editor" && (
          <>
            <SettingRow
              name="Font size"
              description="Set the size of the text in your notes."
              labelFor="settings-font-size"
              control={
                <>
                  <input
                    id="settings-font-size"
                    type="range"
                    min={12}
                    max={24}
                    step={1}
                    value={fontSize}
                    onChange={(event) => onFontSize(Number(event.target.value))}
                  />
                  <output
                    className="setting-value"
                    htmlFor="settings-font-size"
                  >
                    {fontSize} px
                  </output>
                </>
              }
            />
            <SettingRow
              name="Spellcheck"
              description="Check spelling while editing your notes."
              labelId="settings-spellcheck-label"
              control={
                <Toggle
                  checked={spellcheck}
                  onChange={onSpellcheck}
                  labelId="settings-spellcheck-label"
                />
              }
            />
            <SettingRow
              name="Readable line length"
              description="Keep the editor at a comfortable reading width."
              labelId="editor-readable-width-label"
              control={
                <Toggle
                  checked={readableWidth}
                  onChange={onReadableWidth}
                  labelId="editor-readable-width-label"
                />
              }
            />
          </>
        )}

        {section === "files" && (
          <>
            <SettingRow
              name="Import Markdown files"
              description="Add .md or .txt files from your device to this vault."
              control={
                <button
                  type="button"
                  className="settings-button"
                  onClick={onImport}
                >
                  Import
                </button>
              }
            />
            <SettingRow
              name="Export vault"
              description="Download a JSON copy of all your active notes."
              control={
                <button
                  type="button"
                  className="settings-button"
                  onClick={onExport}
                >
                  Export
                </button>
              }
            />
            <SettingRow
              name="Internal links"
              description="Connect notes using double brackets and a note title."
              control={<code>[[Note title]]</code>}
            />
            <p className="settings-note">
              To export one note as a Markdown file, open its more options menu
              and select Export Markdown.
            </p>
          </>
        )}

        {section === "hotkeys" && (
          <>
            <p className="settings-description">
              Use Cmd on macOS or Ctrl on Windows and Linux.
            </p>
            <div className="settings-shortcuts">
              {[
                ["Find anything", "Cmd / Ctrl K"],
                ["Create a note", "Cmd / Ctrl N"],
                ["Toggle reading view", "Cmd / Ctrl E"],
                ["Close a dialog", "Esc"],
              ].map(([name, keys]) => (
                <div className="settings-shortcut-row" key={name}>
                  <span>{name}</span>
                  <kbd>{keys}</kbd>
                </div>
              ))}
            </div>
            <button type="button" className="settings-button" onClick={onHelp}>
              View shortcut help
            </button>
          </>
        )}

        {section === "sync" && (
          <>
            {user ? (
              <>
                <div className="settings-user">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <SettingRow
                  name="Sync status"
                  description="Your account notes synchronize across your devices."
                  control={<span className="setting-value">{syncLabel}</span>}
                />
                <SettingRow
                  name="Account"
                  description="Sign out and return to the guest vault on this device."
                  control={
                    <button
                      type="button"
                      className="settings-button"
                      disabled={signingOut}
                      onClick={async () => {
                        setSigningOut(true);
                        setError("");
                        try {
                          await onLogout();
                        } catch (cause) {
                          setError(
                            cause instanceof Error
                              ? cause.message
                              : "Could not sign out. Try again.",
                          );
                        } finally {
                          setSigningOut(false);
                        }
                      }}
                    >
                      {signingOut ? "Signing out…" : "Sign out"}
                    </button>
                  }
                />
                {error && (
                  <p className="settings-error" role="alert">
                    {error}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="settings-description">
                  Your notes are currently saved in this browser. Create an
                  account or sign in to keep your vault in sync across devices.
                </p>
                <SettingRow
                  name="Bedrock Sync"
                  description={syncLabel}
                  control={
                    <button
                      type="button"
                      className="settings-button primary"
                      onClick={onSignIn}
                    >
                      Sign in
                    </button>
                  }
                />
              </>
            )}
            <p className="settings-note">
              Edits are saved locally while offline and sync when you reconnect.
              If a note changes on two devices at once, Bedrock keeps a conflict
              copy.
            </p>
          </>
        )}

        {section === "about" && (
          <>
            <div className="settings-version">Bedrock 3</div>
            <p className="settings-description">
              An independent web workspace for Markdown notes and connected
              thinking.
            </p>
            <p className="settings-description">
              Bedrock blends the linked thinking of Obsidian with the calm
              page layout of Notion. It is a separate application and is not
              affiliated with or endorsed by either.
            </p>
            <p className="settings-note">
              This web version supports notes, links, graphs, and account sync.
              Obsidian plugins, password recovery, and end-to-end encryption are
              not available.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
