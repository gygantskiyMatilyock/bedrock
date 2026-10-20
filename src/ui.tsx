import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { FileText, X } from "lucide-react";
import type { Note } from "./types";

export function Rock({ small = false }: { small?: boolean }) {
  return (
    <svg
      width={small ? 16 : 30}
      height={small ? 18 : 34}
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

export function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <span className={"brand-mark" + (large ? " large" : "")}>
      <Rock small={!large} />
    </span>
  );
}

export function IconButton({
  children,
  label,
  onClick,
  active = false,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      className={"icon-button " + (active ? "active " : "") + className}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function NoteIcon({ note, size = 15 }: { note: Note; size?: number }) {
  return note.icon ? (
    <span className="emoji-icon" aria-hidden="true">
      {note.icon}
    </span>
  ) : (
    <FileText size={size} className="page-glyph" aria-hidden="true" />
  );
}

export function Modal({
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
            <X size={16} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const shortDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

export function editedLabel(timestamp: number, now = Date.now()) {
  const seconds = Math.round((now - timestamp) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 7) return relative.format(-days, "day");
  return shortDate.format(timestamp);
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  return hour < 5
    ? "Good night"
    : hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";
}
