import type { PieceDef, Connector } from "../types";

const NS = "http://www.w3.org/2000/svg";

const W = 155;
const BORDER = 0;
const SLOT_Y = 35;
const RAIL_OFFSET = 2;
const SLOT_GAP = 10; // mm — break in a slot where a perpendicular slot crosses

const BORDER_CENTRE = W / 2 - BORDER / 2;

/**
 * Geometry of a 90° crossover. The crossing point is the local-frame origin.
 * Segment A runs horizontally (west ↔ east); segment B runs vertically
 * (north ↔ south, where +y is south in screen coords). Each "side" length is
 * the distance from the crossing to that segment's connector — so a symmetric
 * crossover sets all four to the same value, and an asymmetric one varies them.
 */
interface CrossoverGeometry {
  /** Distance from the crossing to segment A's west (conn 0) connector. */
  aWest: number;
  /** Distance from the crossing to segment A's east (conn 1) connector. */
  aEast: number;
  /** Distance from the crossing to segment B's north (conn 2) connector. */
  bNorth: number;
  /** Distance from the crossing to segment B's south (conn 3) connector. */
  bSouth: number;
}

interface CrossoverOptions {
  id: string;
  name: string;
  /** Convenience for a symmetric crossover: sets all four sides to half this. */
  segmentLength?: number;
  /** For asymmetric crossovers, specify each side explicitly. */
  geometry?: CrossoverGeometry;
  /** Rotation step for the R-key / rotation handles. Defaults to 90°. */
  rotateStep?: number;
  /**
   * If true, segment B (perpendicular) is rendered as if elevated above
   * segment A — B's body conceals A's slots at the crossing and a drop-shadow
   * under B's footprint signals the elevation.
   *
   * If false (default), both segments share the same level: the two bodies
   * overlap at the crossing and each slot is visibly broken at the points
   * where a perpendicular slot crosses it.
   */
  elevated?: boolean;
}

export function makeCrossover(opts: CrossoverOptions): PieceDef {
  const { id, name, elevated = false } = opts;
  const geom = resolveGeometry(opts);

  // Connectors numbered around the crossing: 0=west, 1=east, 2=north, 3=south.
  const connectors: Connector[] = [
    { pos: { x: -geom.aWest, y: 0 }, angle: 180 },
    { pos: { x: geom.aEast, y: 0 }, angle: 0 },
    { pos: { x: 0, y: -geom.bNorth }, angle: 270 },
    { pos: { x: 0, y: geom.bSouth }, angle: 90 },
  ];

  // Bbox is the axis-aligned hull of both segment bodies in local coords.
  const minX = Math.min(-geom.aWest, -W / 2);
  const maxX = Math.max(geom.aEast, W / 2);
  const minY = Math.min(-geom.bNorth, -W / 2);
  const maxY = Math.max(geom.bSouth, W / 2);

  return {
    id,
    name,
    connectors,
    rotateStep: opts.rotateStep ?? 90,
    bbox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    render() {
      return elevated ? renderElevated(geom) : renderFlat(geom);
    },
  };
}

function resolveGeometry(opts: CrossoverOptions): CrossoverGeometry {
  if (opts.geometry) return opts.geometry;
  if (opts.segmentLength === undefined) {
    throw new Error(`Crossover ${opts.id}: provide either segmentLength or geometry`);
  }
  const half = opts.segmentLength / 2;
  return { aWest: half, aEast: half, bNorth: half, bSouth: half };
}

function renderElevated(geom: CrossoverGeometry): SVGElement[] {
  // Segment A under, drop-shadow, then segment B over. B's body conceals A's
  // slots at the crossing — the user-facing over/under indicator.
  return [
    ...horizontalSegment(geom),
    verticalShadow(geom),
    ...verticalSegment(geom),
  ];
}

function renderFlat(geom: CrossoverGeometry): SVGElement[] {
  const { aWest, aEast, bNorth, bSouth } = geom;
  const parts: SVGElement[] = [];

  // Both bodies drawn at the same level — overlap at the crossing fills the `+`.
  parts.push(rect(-aWest, -W / 2, aWest + aEast, W, "body"));
  parts.push(rect(-W / 2, -bNorth, W, bNorth + bSouth, "body"));

  // Borders run continuously along each segment's length (BORDER=0 today,
  // so visually invisible — kept for parity with the straight renderer).
  parts.push(line(-aWest, -BORDER_CENTRE, aEast, -BORDER_CENTRE, "border", BORDER));
  parts.push(line(-aWest, BORDER_CENTRE, aEast, BORDER_CENTRE, "border", BORDER));
  parts.push(line(-BORDER_CENTRE, -bNorth, -BORDER_CENTRE, bSouth, "border", BORDER));
  parts.push(line(BORDER_CENTRE, -bNorth, BORDER_CENTRE, bSouth, "border", BORDER));

  // Rails — continuous, accept the small `+` crossing artefact at intersections.
  for (const sign of [-1, 1] as const) {
    const y = sign * SLOT_Y;
    parts.push(line(-aWest, y - RAIL_OFFSET, aEast, y - RAIL_OFFSET, "rail"));
    parts.push(line(-aWest, y + RAIL_OFFSET, aEast, y + RAIL_OFFSET, "rail"));
    const x = sign * SLOT_Y;
    parts.push(line(x - RAIL_OFFSET, -bNorth, x - RAIL_OFFSET, bSouth, "rail"));
    parts.push(line(x + RAIL_OFFSET, -bNorth, x + RAIL_OFFSET, bSouth, "rail"));
  }

  // Slots — each slot is broken at the two points where a perpendicular slot
  // crosses it, leaving SLOT_GAP of clear track between segments.
  const g = SLOT_GAP / 2;
  for (const sign of [-1, 1] as const) {
    const y = sign * SLOT_Y;
    parts.push(line(-aWest, y, -SLOT_Y - g, y, "slot"));
    parts.push(line(-SLOT_Y + g, y, SLOT_Y - g, y, "slot"));
    parts.push(line(SLOT_Y + g, y, aEast, y, "slot"));
  }
  for (const sign of [-1, 1] as const) {
    const x = sign * SLOT_Y;
    parts.push(line(x, -bNorth, x, -SLOT_Y - g, "slot"));
    parts.push(line(x, -SLOT_Y + g, x, SLOT_Y - g, "slot"));
    parts.push(line(x, SLOT_Y + g, x, bSouth, "slot"));
  }

  return parts;
}

function horizontalSegment(geom: CrossoverGeometry): SVGElement[] {
  const { aWest, aEast } = geom;
  const body = rect(-aWest, -W / 2, aWest + aEast, W, "body");
  const borderTop = line(-aWest, -BORDER_CENTRE, aEast, -BORDER_CENTRE, "border", BORDER);
  const borderBot = line(-aWest, BORDER_CENTRE, aEast, BORDER_CENTRE, "border", BORDER);
  const slotTop = line(-aWest, -SLOT_Y, aEast, -SLOT_Y, "slot");
  const slotBot = line(-aWest, SLOT_Y, aEast, SLOT_Y, "slot");
  const railTopOuter = line(-aWest, -SLOT_Y - RAIL_OFFSET, aEast, -SLOT_Y - RAIL_OFFSET, "rail");
  const railTopInner = line(-aWest, -SLOT_Y + RAIL_OFFSET, aEast, -SLOT_Y + RAIL_OFFSET, "rail");
  const railBotOuter = line(-aWest, SLOT_Y + RAIL_OFFSET, aEast, SLOT_Y + RAIL_OFFSET, "rail");
  const railBotInner = line(-aWest, SLOT_Y - RAIL_OFFSET, aEast, SLOT_Y - RAIL_OFFSET, "rail");
  return [body, borderTop, borderBot, railTopOuter, railTopInner, railBotOuter, railBotInner, slotTop, slotBot];
}

function verticalSegment(geom: CrossoverGeometry): SVGElement[] {
  const { bNorth, bSouth } = geom;
  const body = rect(-W / 2, -bNorth, W, bNorth + bSouth, "body");
  const borderLeft = line(-BORDER_CENTRE, -bNorth, -BORDER_CENTRE, bSouth, "border", BORDER);
  const borderRight = line(BORDER_CENTRE, -bNorth, BORDER_CENTRE, bSouth, "border", BORDER);
  const slotLeft = line(-SLOT_Y, -bNorth, -SLOT_Y, bSouth, "slot");
  const slotRight = line(SLOT_Y, -bNorth, SLOT_Y, bSouth, "slot");
  const railLeftOuter = line(-SLOT_Y - RAIL_OFFSET, -bNorth, -SLOT_Y - RAIL_OFFSET, bSouth, "rail");
  const railLeftInner = line(-SLOT_Y + RAIL_OFFSET, -bNorth, -SLOT_Y + RAIL_OFFSET, bSouth, "rail");
  const railRightOuter = line(SLOT_Y + RAIL_OFFSET, -bNorth, SLOT_Y + RAIL_OFFSET, bSouth, "rail");
  const railRightInner = line(SLOT_Y - RAIL_OFFSET, -bNorth, SLOT_Y - RAIL_OFFSET, bSouth, "rail");
  return [body, borderLeft, borderRight, railLeftOuter, railLeftInner, railRightOuter, railRightInner, slotLeft, slotRight];
}

function verticalShadow(geom: CrossoverGeometry): SVGElement {
  // Drop-shadow rect drawn before segment B's body; offset down-right so the
  // visible portion forms an L underneath/beside B and signals elevation.
  const offset = 4;
  return rect(-W / 2 + offset, -geom.bNorth + offset, W, geom.bNorth + geom.bSouth, "shadow");
}

function rect(x: number, y: number, w: number, h: number, cls: string): SVGRectElement {
  const r = document.createElementNS(NS, "rect");
  r.setAttribute("x", String(x));
  r.setAttribute("y", String(y));
  r.setAttribute("width", String(w));
  r.setAttribute("height", String(h));
  r.setAttribute("class", cls);
  return r;
}

function line(x1: number, y1: number, x2: number, y2: number, cls: string, width?: number): SVGLineElement {
  const l = document.createElementNS(NS, "line");
  l.setAttribute("x1", String(x1));
  l.setAttribute("x2", String(x2));
  l.setAttribute("y1", String(y1));
  l.setAttribute("y2", String(y2));
  l.setAttribute("class", cls);
  if (width !== undefined) l.setAttribute("stroke-width", String(width));
  return l;
}

// C8295 Elevated Crossover — symmetric, two 262 mm straights (= C8222 + C8200)
// crossing at 90° at their midpoints, with segment B elevated over segment A.
export const c8295: PieceDef = makeCrossover({
  id: "c8295-elevated-crossover",
  name: "C8295 Elevated Crossover",
  segmentLength: 262,
  elevated: true,
});

// C8210 Straight Crossover — symmetric `+` of two 409 mm straights crossing at
// 90° at their midpoints. The per-side geometry on makeCrossover is retained
// for future asymmetric variants if needed.
export const c8210: PieceDef = makeCrossover({
  id: "c8210-straight-crossover",
  name: "C8210 Straight Crossover",
  segmentLength: 409,
  elevated: false,
});