import { useId, useMemo, useState } from "react";
import type { Note } from "./types";

type GraphProps = {
  notes: Note[];
  activeId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
};

type Point = { note: Note; x: number; y: number; degree: number };
type Edge = { from: string; to: string };

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) {
    result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  }
  return result >>> 0;
}

function createGraph(notes: Note[], activeId: string) {
  const visible = notes
    .filter((note) => !note.deleted)
    .sort((a, b) => a.id.localeCompare(b.id));
  const byTitle = new Map(
    visible.map((note) => [note.title.trim().toLocaleLowerCase(), note.id]),
  );
  const neighbors = new Map(
    visible.map((note) => [note.id, new Set<string>()]),
  );
  const edges: Edge[] = [];
  const seen = new Set<string>();

  for (const note of visible) {
    for (const match of note.content.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
      const target = match[1]
        .split("|")[0]
        .split("#")[0]
        .trim()
        .toLocaleLowerCase();
      const targetId = byTitle.get(target);
      if (!targetId || targetId === note.id) continue;
      const key = [note.id, targetId].sort().join("\0");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: note.id, to: targetId });
      neighbors.get(note.id)?.add(targetId);
      neighbors.get(targetId)?.add(note.id);
    }
  }

  const anchor =
    visible.find((note) => note.id === activeId) ??
    [...visible].sort(
      (a, b) =>
        (neighbors.get(b.id)?.size ?? 0) - (neighbors.get(a.id)?.size ?? 0),
    )[0];
  const connected = neighbors.get(anchor?.id ?? "") ?? new Set<string>();
  const surrounding = visible
    .filter((note) => note.id !== anchor?.id)
    .sort(
      (a, b) =>
        Number(connected.has(b.id)) - Number(connected.has(a.id)) ||
        hash(a.id) - hash(b.id),
    );
  const points: Point[] = anchor
    ? [
        {
          note: anchor,
          x: 450,
          y: 290,
          degree: neighbors.get(anchor.id)?.size ?? 0,
        },
      ]
    : [];
  surrounding.forEach((note, index) => {
    const angle = index * 2.3999632297 + 0.38;
    const jitter = hash(note.id) % 29;
    const radius = connected.has(note.id)
      ? 137 + jitter
      : 208 + jitter + (index % 3) * 12;
    points.push({
      note,
      x: 450 + Math.cos(angle) * radius * 1.34,
      y: 290 + Math.sin(angle) * radius * 0.82,
      degree: neighbors.get(note.id)?.size ?? 0,
    });
  });

  // A bounded static relaxation gives linked clusters room without moving as the user writes.
  if (points.length < 100) {
    const byId = new Map(points.map((point) => [point.note.id, point]));
    for (let iteration = 0; iteration < 60; iteration++) {
      const offsets = points.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const distance = Math.max(Math.hypot(dx, dy), 1);
          const force = Math.min(2.4, 1300 / (distance * distance));
          offsets[i].x += (dx / distance) * force;
          offsets[i].y += (dy / distance) * force;
          offsets[j].x -= (dx / distance) * force;
          offsets[j].y -= (dy / distance) * force;
        }
      }
      for (const edge of edges) {
        const from = byId.get(edge.from)!;
        const to = byId.get(edge.to)!;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.max(Math.hypot(dx, dy), 1);
        const force = (distance - 155) * 0.005;
        if (from !== points[0]) {
          from.x += (dx / distance) * force;
          from.y += (dy / distance) * force;
        }
        if (to !== points[0]) {
          to.x -= (dx / distance) * force;
          to.y -= (dy / distance) * force;
        }
      }
      points.forEach((point, index) => {
        if (!index) return;
        point.x = Math.max(100, Math.min(800, point.x + offsets[index].x));
        point.y = Math.max(75, Math.min(505, point.y + offsets[index].y));
      });
    }
  }
  return { points, edges, neighbors };
}

export function Graph({
  notes,
  activeId,
  onSelect,
  compact = false,
}: GraphProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const graph = useMemo(() => createGraph(notes, activeId), [notes, activeId]);
  const patternId = useId().replace(/:/g, "");
  const displayedPoints = useMemo(() => {
    if (!compact || !graph.points.length) return graph.points;
    const minX = Math.min(...graph.points.map((point) => point.x));
    const maxX = Math.max(...graph.points.map((point) => point.x));
    const minY = Math.min(...graph.points.map((point) => point.y));
    const maxY = Math.max(...graph.points.map((point) => point.y));
    return graph.points.map((point) => ({
      ...point,
      x: maxX === minX ? 120 : 26 + ((point.x - minX) / (maxX - minX)) * 188,
      y: maxY === minY ? 78 : 23 + ((point.y - minY) / (maxY - minY)) * 118,
    }));
  }, [graph.points, compact]);
  const pointsById = new Map(
    displayedPoints.map((point) => [point.note.id, point]),
  );
  const emphasis = hovered ?? activeId;
  const adjacent = graph.neighbors.get(emphasis) ?? new Set<string>();

  return (
    <div
      className={`knowledge-graph${compact ? " knowledge-graph--compact" : ""}`}
    >
      <style>{`
        .knowledge-graph { --graph-node: #8b9a80; --graph-core: #45634b; --graph-line: #b8c0af; --graph-label: #747c6d; --graph-halo: #92aa83; position: relative; width: 100%; height: 100%; min-height: 360px; overflow: hidden; }
        .knowledge-graph--compact { --graph-background: #f5f7ee; height: 180px; min-height: 0; }
        .knowledge-graph svg { display: block; width: 100%; height: 100%; overflow: visible; }
        .knowledge-graph .graph-edge { stroke: var(--graph-line); stroke-width: 1; opacity: .45; vector-effect: non-scaling-stroke; }
        .knowledge-graph .graph-edge--active { stroke: var(--graph-node); opacity: .8; }
        .knowledge-graph .graph-node { cursor: pointer; outline: none; }
        .knowledge-graph .graph-dot { fill: var(--graph-node); stroke: var(--graph-node); stroke-width: 2; }
        .knowledge-graph .graph-node--selected .graph-dot { fill: var(--graph-core); stroke: var(--graph-core); }
        .knowledge-graph .graph-node--near .graph-dot { fill: #728969; }
        .knowledge-graph .graph-node:focus-visible .graph-focus { opacity: 1; }
        .knowledge-graph .graph-focus { fill: none; stroke: var(--graph-core); stroke-width: 2; opacity: 0; stroke-dasharray: 3 3; }
        .knowledge-graph .graph-label { fill: var(--graph-label); font-family: inherit; font-weight: 400; pointer-events: none; }
        .knowledge-graph--compact .graph-label { paint-order: stroke; stroke: var(--graph-background); stroke-width: 3px; stroke-linejoin: round; }
        .knowledge-graph .graph-node--selected .graph-label { fill: var(--graph-core); font-weight: 600; }
        .knowledge-graph .graph-empty { position: absolute; bottom: 28px; left: 20px; right: 20px; margin: 0; text-align: center; color: var(--graph-label); font-size: 13px; line-height: 1.6; pointer-events: none; }
        .knowledge-graph .graph-empty code { font-size: .9em; }
        .knowledge-graph--compact .graph-empty { bottom: 5px; font-size: 10px; }
        [data-theme="dark"] .knowledge-graph, .dark .knowledge-graph { --graph-node: #8caa87; --graph-core: #bbd3ad; --graph-line: #566650; --graph-label: #9aa993; --graph-halo: #75966a; --graph-background: #283122; }
        @media (hover:hover) and (pointer:fine) { .knowledge-graph .graph-node:hover .graph-dot { stroke: var(--graph-core); stroke-width: 3; } }
      `}</style>
      <svg
        viewBox={compact ? "0 0 240 180" : "0 0 900 600"}
        role="group"
        aria-label={
          compact
            ? "Local note connections"
            : "Knowledge graph. Select a note to open it."
        }
      >
        {!compact && (
          <defs>
            <pattern
              id={patternId}
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="1"
                cy="1"
                r=".7"
                fill="var(--graph-label)"
                opacity=".14"
              />
            </pattern>
          </defs>
        )}
        {!compact && (
          <rect
            width="900"
            height="600"
            fill={`url(#${patternId})`}
            aria-hidden="true"
          />
        )}
        <g aria-hidden="true">
          {graph.edges.map((edge) => {
            const from = pointsById.get(edge.from)!;
            const to = pointsById.get(edge.to)!;
            const highlighted = edge.from === emphasis || edge.to === emphasis;
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={`graph-edge${highlighted ? " graph-edge--active" : ""}`}
              />
            );
          })}
        </g>
        {displayedPoints.map((point) => {
          const selected = point.note.id === activeId;
          const focused = point.note.id === emphasis;
          const radius =
            (compact ? 3.8 : 5.5) +
            Math.min(point.degree, 6) * (compact ? 0.5 : 0.8) +
            (selected ? 2.5 : 0);
          const showLabel =
            !compact || (hovered ? point.note.id === hovered : selected);
          const maxLength = compact ? 26 : 30;
          const title = point.note.title || "Untitled";
          const label =
            title.length > maxLength
              ? `${title.slice(0, maxLength - 1)}…`
              : title;
          return (
            <g
              key={point.note.id}
              transform={`translate(${point.x} ${point.y})`}
              className={`graph-node${selected ? " graph-node--selected" : ""}${adjacent.has(point.note.id) ? " graph-node--near" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`Open ${title}, ${point.degree} ${point.degree === 1 ? "connection" : "connections"}`}
              aria-pressed={selected}
              onClick={() => onSelect(point.note.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(point.note.id);
                }
              }}
              onMouseEnter={() => setHovered(point.note.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(point.note.id)}
              onBlur={() => setHovered(null)}
            >
              <title>
                {title} · {point.degree}{" "}
                {point.degree === 1 ? "connection" : "connections"}
              </title>
              <circle
                r={compact ? 14 : Math.max(22, radius + 10)}
                fill="transparent"
              />
              {(selected || focused) && (
                <circle
                  r={radius + (compact ? 7 : 9)}
                  fill="var(--graph-halo)"
                  opacity=".13"
                  aria-hidden="true"
                />
              )}
              {selected && (
                <circle
                  r={radius + (compact ? 13 : 19)}
                  fill="none"
                  stroke="var(--graph-halo)"
                  strokeWidth="1"
                  opacity=".2"
                  aria-hidden="true"
                />
              )}
              <circle
                r={radius + (compact ? 5 : 7)}
                className="graph-focus"
                aria-hidden="true"
              />
              <circle r={radius} className="graph-dot" aria-hidden="true" />
              {showLabel && (
                <text
                  y={radius + (compact ? 17 : 22)}
                  fontSize={compact ? 11.5 : 13}
                  textAnchor={
                    compact && point.x < 75
                      ? "start"
                      : compact && point.x > 165
                        ? "end"
                        : "middle"
                  }
                  className="graph-label"
                  aria-hidden="true"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {graph.edges.length === 0 && (
        <p className="graph-empty">
          {graph.points.length ? (
            <>
              Connect your thoughts with <code>[[note links]]</code>
            </>
          ) : (
            "Your ideas will find their connections here."
          )}
        </p>
      )}
    </div>
  );
}

export default Graph;
