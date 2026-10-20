import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Note } from "./types";

type GraphProps = {
  notes: Note[];
  activeId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
  showLabels?: boolean;
  nodeScale?: number;
};
type Point = { note: Note; x: number; y: number; degree: number };
type Edge = { from: string; to: string };
type Position = { x: number; y: number };
type Gesture = {
  id: string | null;
  start: Position;
  origin: Position;
  moved: boolean;
};

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
    // Never join an unfinished [[ in one paragraph to a link in a later paragraph.
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
  if (!anchor) return { points: [] as Point[], edges, neighbors };
  const connected = neighbors.get(anchor.id) ?? new Set<string>();
  const surrounding = visible
    .filter((note) => note.id !== anchor.id)
    .sort(
      (a, b) =>
        Number(connected.has(b.id)) - Number(connected.has(a.id)) ||
        hash(a.id) - hash(b.id),
    );
  const points: Point[] = [
    {
      note: anchor,
      x: 450,
      y: 300,
      degree: neighbors.get(anchor.id)?.size ?? 0,
    },
  ];
  surrounding.forEach((note, index) => {
    const angle = index * 2.3999632297 - 0.42;
    const radius =
      175 + (hash(note.id) % 50) + (connected.has(note.id) ? 0 : 45);
    points.push({
      note,
      x: 450 + Math.cos(angle) * radius * 1.18,
      y: 300 + Math.sin(angle) * radius * 0.92,
      degree: neighbors.get(note.id)?.size ?? 0,
    });
  });

  // Resolve a stable layout once per note set; no perpetual motion while writing.
  if (points.length <= 120) {
    const byId = new Map(points.map((point) => [point.note.id, point]));
    for (let iteration = 0; iteration < 75; iteration++) {
      const offsets = points.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const distance = Math.max(Math.hypot(dx, dy), 1);
          const force = Math.min(3.5, 2400 / (distance * distance));
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
        const force = (distance - 205) * 0.004;
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
        point.x = Math.max(150, Math.min(750, point.x + offsets[index].x));
        point.y = Math.max(85, Math.min(515, point.y + offsets[index].y));
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
  showLabels = true,
  nodeScale = 1,
}: GraphProps) {
  const container = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [offsets, setOffsets] = useState<Record<string, Position>>({});
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [ratio, setRatio] = useState(1);
  const graph = useMemo(() => createGraph(notes, activeId), [notes, activeId]);
  const width = compact ? 240 : 900;
  const height = compact ? 180 : 600;
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () =>
      setRatio(
        Math.max(
          0.2,
          Math.min(element.clientWidth / width, element.clientHeight / height),
        ),
      );
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [width, height]);
  useEffect(() => {
    setOffsets({});
    setPan({ x: 0, y: 0 });
  }, [activeId]);

  const displayedPoints = useMemo(() => {
    const extentX = Math.max(
      1,
      ...graph.points.map((point) => Math.abs(point.x - 450)),
    );
    const extentY = Math.max(
      1,
      ...graph.points.map((point) => Math.abs(point.y - 300)),
    );
    const scaleX = Math.min(compact ? 0.5 : 2, (compact ? 86 : 320) / extentX);
    const scaleY = Math.min(compact ? 0.5 : 2, (compact ? 55 : 215) / extentY);
    return graph.points.map((point) => {
      const position = offsets[point.note.id];
      return {
        ...point,
        x: position?.x ?? (compact ? 120 : 450) + (point.x - 450) * scaleX,
        y: position?.y ?? (compact ? 87 : 300) + (point.y - 300) * scaleY,
      };
    });
  }, [graph.points, offsets, compact]);
  const pointsById = new Map(
    displayedPoints.map((point) => [point.note.id, point]),
  );
  const adjacent =
    graph.neighbors.get(hovered ?? activeId) ?? new Set<string>();
  const toPoint = (event: ReactPointerEvent<SVGElement>): Position => {
    const point = svg.current!.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.current!.getScreenCTM();
    const transformed = matrix
      ? point.matrixTransform(matrix.inverse())
      : point;
    return { x: transformed.x, y: transformed.y };
  };
  const start = (event: ReactPointerEvent<SVGElement>, point?: Point) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const position = toPoint(event);
    gesture.current = {
      id: point?.note.id ?? null,
      start: position,
      origin: point ? { x: point.x, y: point.y } : pan,
      moved: false,
    };
    svg.current?.setPointerCapture(event.pointerId);
  };
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const current = gesture.current;
    if (!current) return;
    const position = toPoint(event);
    const dx = position.x - current.start.x,
      dy = position.y - current.start.y;
    if (Math.hypot(dx, dy) * ratio > 4) {
      current.moved = true;
      setDragging(true);
    }
    if (!current.moved) return;
    if (current.id)
      setOffsets((previous) => ({
        ...previous,
        [current.id!]: { x: current.origin.x + dx, y: current.origin.y + dy },
      }));
    else setPan({ x: current.origin.x + dx, y: current.origin.y + dy });
  };
  const end = (event: ReactPointerEvent<SVGSVGElement>) => {
    const completed = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (svg.current?.hasPointerCapture(event.pointerId))
      svg.current.releasePointerCapture(event.pointerId);
    // Pointer capture retargets pointer-up to the canvas instead of the node.
    if (completed?.id && !completed.moved) onSelect(completed.id);
  };

  return (
    <div
      ref={container}
      className={`knowledge-graph${compact ? " knowledge-graph--compact" : ""}${dragging ? " knowledge-graph--dragging" : ""}`}
    >
      <style>{`
      .knowledge-graph { --graph-node: #a7a7a7; --graph-active: #ffffff; --graph-edge: #535353; --graph-label: #8a8a8a; --graph-hover: #a88bfa; --graph-background: #1e1e1e; position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden; user-select: none; }
      .knowledge-graph--compact { min-height: 140px; }
      .knowledge-graph svg { display: block; width: 100%; height: 100%; overflow: hidden; touch-action: none; cursor: grab; }
      .knowledge-graph--dragging svg, .knowledge-graph--dragging .graph-node { cursor: grabbing; }
      .knowledge-graph .graph-edge { stroke: var(--graph-edge); stroke-width: .65; opacity: .65; vector-effect: non-scaling-stroke; }
      .knowledge-graph .graph-edge--active { stroke: #727272; opacity: .9; }
      .knowledge-graph .graph-edge--hover { stroke: var(--graph-hover); opacity: .85; }
      .knowledge-graph .graph-node { cursor: pointer; outline: none; }
      .knowledge-graph .graph-dot { fill: var(--graph-node); }
      .knowledge-graph .graph-node--selected .graph-dot { fill: var(--graph-active); }
      .knowledge-graph .graph-node--hovered .graph-dot { fill: var(--graph-hover); }
      .knowledge-graph .graph-node--dimmed { opacity: .32; }
      .knowledge-graph .graph-focus { fill: none; stroke: var(--graph-hover); stroke-width: 1.5; vector-effect: non-scaling-stroke; opacity: 0; }
      .knowledge-graph .graph-node:focus-visible .graph-focus { opacity: 1; }
      .knowledge-graph .graph-label { fill: var(--graph-label); font-family: inherit; font-weight: 400; pointer-events: none; paint-order: stroke; stroke: var(--graph-background); stroke-width: 3px; stroke-linejoin: round; }
      .knowledge-graph .graph-node--selected .graph-label { fill: #b3b3b3; }
      .knowledge-graph .graph-node--hovered .graph-label { fill: var(--graph-hover); }
      .knowledge-graph .graph-empty { position: absolute; bottom: 22px; left: 24px; right: 24px; margin: 0; color: var(--graph-label); text-align: center; font-size: 12px; line-height: 1.6; pointer-events: none; }
      .knowledge-graph .graph-empty code { color: var(--graph-hover); font-size: inherit; }
      .knowledge-graph--compact .graph-empty { font-size: 10px; bottom: 8px; }
      [data-theme="light"] .knowledge-graph { --graph-node: #858585; --graph-active: #333333; --graph-edge: #cccccc; --graph-label: #8a8a8a; --graph-hover: #7852ee; --graph-background: #ffffff; }
      [data-theme="light"] .knowledge-graph .graph-node--selected .graph-label { fill: #555555; }
      [data-theme="light"] .knowledge-graph .graph-edge--active { stroke: #aaaaaa; }
    `}</style>
      <svg
        ref={svg}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label="Knowledge graph. Select a note to open it. Drag nodes or the background to rearrange the view."
        onPointerDown={(event) => start(event)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={() => {
          setPan({ x: 0, y: 0 });
          setOffsets({});
        }}
      >
        <g transform={`translate(${pan.x} ${pan.y})`}>
          <g aria-hidden="true">
            {graph.edges.map((edge) => {
              const from = pointsById.get(edge.from)!,
                to = pointsById.get(edge.to)!;
              const active = edge.from === activeId || edge.to === activeId;
              const highlighted =
                hovered && (edge.from === hovered || edge.to === hovered);
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={`graph-edge${active ? " graph-edge--active" : ""}${highlighted ? " graph-edge--hover" : ""}`}
                />
              );
            })}
          </g>
          {displayedPoints.map((point) => {
            const selected = point.note.id === activeId;
            const focused = point.note.id === hovered;
            const radius =
              (((compact ? 3.2 : 4.3) +
                Math.min(point.degree, 6) * 0.25 +
                (selected ? 1.7 : 0)) *
                nodeScale) /
              ratio;
            const title = point.note.title || "Untitled";
            const label =
              title.length > (compact ? 22 : 30)
                ? `${title.slice(0, compact ? 21 : 29)}…`
                : title;
            const isDimmed =
              hovered && !focused && !adjacent.has(point.note.id);
            const labelVisible =
              focused ||
              (showLabels && (!compact || (hovered ? focused : selected)));
            return (
              <g
                key={point.note.id}
                transform={`translate(${point.x} ${point.y})`}
                className={`graph-node${selected ? " graph-node--selected" : ""}${focused ? " graph-node--hovered" : ""}${isDimmed ? " graph-node--dimmed" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`Open ${title}, ${point.degree} ${point.degree === 1 ? "connection" : "connections"}`}
                aria-pressed={selected}
                onPointerDown={(event) => start(event, point)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (event.detail === 0) onSelect(point.note.id);
                }}
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
                  r={Math.max(16 / ratio, radius + 7)}
                  fill="transparent"
                />
                <circle
                  r={radius + 4 / ratio}
                  className="graph-focus"
                  aria-hidden="true"
                />
                <circle r={radius} className="graph-dot" aria-hidden="true" />
                {labelVisible && (
                  <text
                    y={radius + 16 / ratio}
                    fontSize={(compact ? 10 : 11) / ratio}
                    textAnchor="middle"
                    className="graph-label"
                    aria-hidden="true"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      {!graph.edges.length && (
        <p className="graph-empty">
          {graph.points.length ? (
            <>
              Create connections with <code>[[note links]]</code>
            </>
          ) : (
            "No notes to display."
          )}
        </p>
      )}
    </div>
  );
}
export default Graph;
