import { forwardRef, useLayoutEffect, useRef } from "react";
import type { ReactNode, TextareaHTMLAttributes } from "react";

// Obsidian-style source mode: a transparent textarea over a tinted copy of
// the same text. Only colors change, never metrics, so both layers wrap
// identically and the caret always sits on the right character.
const inline =
  /(\[\[[^\]\n]+\]\])|(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\([^)\n]+\))|(#[\w/-]+)/g;

function tintInline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(inline)) {
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const token = match[0];
    const k = `${key}-${index++}`;
    if (match[1])
      out.push(
        <span key={k}>
          <span className="md-mark">[[</span>
          <span className="md-link">{token.slice(2, -2)}</span>
          <span className="md-mark">]]</span>
        </span>,
      );
    else if (match[2])
      out.push(
        <span key={k} className="md-code">
          {token}
        </span>,
      );
    else if (match[3])
      out.push(
        <span key={k} className="md-strong">
          <span className="md-mark">**</span>
          {token.slice(2, -2)}
          <span className="md-mark">**</span>
        </span>,
      );
    else if (match[4])
      out.push(
        <span key={k} className="md-em">
          <span className="md-mark">*</span>
          {token.slice(1, -1)}
          <span className="md-mark">*</span>
        </span>,
      );
    else if (match[5])
      out.push(
        <span key={k} className="md-link">
          {token}
        </span>,
      );
    else
      out.push(
        <span key={k} className="md-tag">
          {token}
        </span>,
      );
    last = start + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function tintLine(line: string, key: string): ReactNode {
  const heading = line.match(/^(#{1,6}\s)(.*)$/);
  if (heading)
    return (
      <span className="md-heading">
        <span className="md-mark">{heading[1]}</span>
        {tintInline(heading[2], key)}
      </span>
    );
  const quote = line.match(/^(>\s?)(.*)$/);
  if (quote)
    return (
      <span className="md-quote">
        <span className="md-mark">{quote[1]}</span>
        {tintInline(quote[2], key)}
      </span>
    );
  const list = line.match(/^(\s*(?:[-*+]|\d+\.)\s)(\[[ xX]\]\s)?(.*)$/);
  if (list)
    return (
      <span className={list[2] && /x/i.test(list[2]) ? "md-done" : ""}>
        <span className="md-bullet">{list[1]}</span>
        {list[2] && <span className="md-check">{list[2]}</span>}
        {tintInline(list[3], key)}
      </span>
    );
  if (/^(-{3,}|\*{3,})\s*$/.test(line))
    return <span className="md-mark">{line}</span>;
  return tintInline(line, key);
}

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string };

const MarkdownSource = forwardRef<HTMLTextAreaElement, Props>(
  function MarkdownSource({ value, className = "", ...props }, ref) {
    const local = useRef<HTMLTextAreaElement | null>(null);
    useLayoutEffect(() => {
      const el = local.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }, [value]);
    const lines = value.split("\n");
    return (
      <div className="source-surface">
        <div className="source-tint" aria-hidden="true">
          {lines.map((line, i) => (
            <span key={i}>
              {tintLine(line, String(i))}
              {i < lines.length - 1 ? "\n" : "​"}
            </span>
          ))}
        </div>
        <textarea
          {...props}
          ref={(el) => {
            local.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          value={value}
          className={className}
        />
      </div>
    );
  },
);

export default MarkdownSource;
