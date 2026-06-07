import type { PieceDef, Connector } from "../types";

const NS = "http://www.w3.org/2000/svg";

const W = 155;
const BORDER = 0;
const SLOT_Y = 35;
const RAIL_OFFSET = 2;
const SLOT_GAP = 10; // mm — break in a slot where a perpendicular slot crosses

const BORDER_CENTRE = W / 2 - BORDER / 2;

interface CrossoverOptions {
  id: string;
  name: string;
  /** Length of each straight segment, in mm. */
  segmentLength: number;
  /** Rotation step for the R-key / rotation handles. Defaults to 90°. */
  rotateStep?: number;
  /**
   * If true, segment B (perpendicular) is rendered as if elevated above
   * segment A — B's body conceals A's slots at the crossing and a drop-shadow
   * under B's footprint signals the elevation.
   *
   * If false (default), both segments share the same level: the two bodies
   * overlap at the crossing forming a `+` footprint, and each slot is
   * visibly broken at the points where a perpendicular slot crosses it.
   */
  elevated?: boolean;
}

export function makeCrossover(opts: CrossoverOptions): PieceDef {
  const { id, name, segmentLength: LEN, elevated = false } = opts;
  const half = LEN / 2;

  // Local frame centred on the crossing point.
  // 0: west — segment A's left  end (faces -x, angle 180)
  // 1: east — segment A's right end (faces +x, angle 0)
  // 2: north — segment B's top  end (faces -y, angle 270)
  // 3: south — segment B's bottom end (faces +y, angle 90)
  const connectors: Connector[] = [
    { pos: { x: -half, y: 0 }, angle: 180 },
    { pos: { x: half, y: 0 }, angle: 0 },
    { pos: { x: 0, y: -half }, angle: 270 },
    { pos: { x: 0, y: half }, angle: 90 },
  ];

  return {
    id,
    name,
    connectors,
    rotateStep: opts.rotateStep ?? 90,
    bbox: { x: -half, y: -half, w: LEN, h: LEN },
    render() {
      return elevated ? renderElevated(half) : renderFlat(half);
    },
  };
}

function renderElevated(half: number): SVGElement[] {
  // Segment A under, drop-shadow, then segment B over. B's body conceals A's
  // slots at the crossing — the user-facing over/under indicator.
  return [
    ...horizontalSegment(half),
    verticalShadow(half),
    ...verticalSegment(half),
  ];
}

function renderFlat(half: number): SVGElement[] {
  const len = half * 2;
  const parts: SVGElement[] = [];

  // Both bodies drawn at the same level — overlap at the crossing fills a `+`.
  parts.push(rect(-half, -W / 2, len, W, "body"));
  parts.push(rect(-W / 2, -half, W, len, "body"));

  // Borders run continuously along each axis (BORDER=0 today, so visually
  // invisible — kept for parity with the straight renderer).
  parts.push(line(-half, -BORDER_CENTRE, half, -BORDER_CENTRE, "border", BORDER));
  parts.push(line(-half, BORDER_CENTRE, half, BORDER_CENTRE, "border", BORDER));
  parts.push(line(-BORDER_CENTRE, -half, -BORDER_CENTRE, half, "border", BORDER));
  parts.push(line(BORDER_CENTRE, -half, BORDER_CENTRE, half, "border", BORDER));

  // Rails — continuous, accept the small `+` crossing artefact at intersections.
  for (const sign of [-1, 1] as const) {
    const y = sign * SLOT_Y;
    parts.push(line(-half, y - RAIL_OFFSET, half, y - RAIL_OFFSET, "rail"));
    parts.push(line(-half, y + RAIL_OFFSET, half, y + RAIL_OFFSET, "rail"));
    const x = sign * SLOT_Y;
    parts.push(line(x - RAIL_OFFSET, -half, x - RAIL_OFFSET, half, "rail"));
    parts.push(line(x + RAIL_OFFSET, -half, x + RAIL_OFFSET, half, "rail"));
  }

  // Slots — each slot is broken at the two points where a perpendicular slot
  // crosses it, leaving SLOT_GAP of clear track between segments.
  const g = SLOT_GAP / 2;
  for (const sign of [-1, 1] as const) {
    const y = sign * SLOT_Y;
    parts.push(line(-half, y, -SLOT_Y - g, y, "slot"));
    parts.push(line(-SLOT_Y + g, y, SLOT_Y - g, y, "slot"));
    parts.push(line(SLOT_Y + g, y, half, y, "slot"));
  }
  for (const sign of [-1, 1] as const) {
    const x = sign * SLOT_Y;
    parts.push(line(x, -half, x, -SLOT_Y - g, "slot"));
    parts.push(line(x, -SLOT_Y + g, x, SLOT_Y - g, "slot"));
    parts.push(line(x, SLOT_Y + g, x, half, "slot"));
  }

  return parts;
}

function horizontalSegment(half: number): SVGElement[] {
  const len = half * 2;
  const body = rect(-half, -W / 2, len, W, "body");
  const borderTop = line(-half, -BORDER_CENTRE, half, -BORDER_CENTRE, "border", BORDER);
  const borderBot = line(-half, BORDER_CENTRE, half, BORDER_CENTRE, "border", BORDER);
  const slotTop = line(-half, -SLOT_Y, half, -SLOT_Y, "slot");
  const slotBot = line(-half, SLOT_Y, half, SLOT_Y, "slot");
  const railTopOuter = line(-half, -SLOT_Y - RAIL_OFFSET, half, -SLOT_Y - RAIL_OFFSET, "rail");
  const railTopInner = line(-half, -SLOT_Y + RAIL_OFFSET, half, -SLOT_Y + RAIL_OFFSET, "rail");
  const railBotOuter = line(-half, SLOT_Y + RAIL_OFFSET, half, SLOT_Y + RAIL_OFFSET, "rail");
  const railBotInner = line(-half, SLOT_Y - RAIL_OFFSET, half, SLOT_Y - RAIL_OFFSET, "rail");
  return [body, borderTop, borderBot, railTopOuter, railTopInner, railBotOuter, railBotInner, slotTop, slotBot];
}

function verticalSegment(half: number): SVGElement[] {
  const len = half * 2;
  const body = rect(-W / 2, -half, W, len, "body");
  const borderLeft = line(-BORDER_CENTRE, -half, -BORDER_CENTRE, half, "border", BORDER);
  const borderRight = line(BORDER_CENTRE, -half, BORDER_CENTRE, half, "border", BORDER);
  const slotLeft = line(-SLOT_Y, -half, -SLOT_Y, half, "slot");
  const slotRight = line(SLOT_Y, -half, SLOT_Y, half, "slot");
  const railLeftOuter = line(-SLOT_Y - RAIL_OFFSET, -half, -SLOT_Y - RAIL_OFFSET, half, "rail");
  const railLeftInner = line(-SLOT_Y + RAIL_OFFSET, -half, -SLOT_Y + RAIL_OFFSET, half, "rail");
  const railRightOuter = line(SLOT_Y + RAIL_OFFSET, -half, SLOT_Y + RAIL_OFFSET, half, "rail");
  const railRightInner = line(SLOT_Y - RAIL_OFFSET, -half, SLOT_Y - RAIL_OFFSET, half, "rail");
  return [body, borderLeft, borderRight, railLeftOuter, railLeftInner, railRightOuter, railRightInner, slotLeft, slotRight];
}

function verticalShadow(half: number): SVGElement {
  // Drop-shadow rect drawn before segment B's body; offset down-right so the
  // visible portion forms an L underneath/beside B and signals elevation.
  const offset = 4;
  return rect(-W / 2 + offset, -half + offset, W, half * 2, "shadow");
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

// C8295 Elevated Crossover — two 262 mm straights (= C8222 half + C8200 quarter)
// crossing at 90° at their midpoints, with segment B elevated over segment A.
export const c8295: PieceDef = makeCrossover({
  id: "c8295-elevated-crossover",
  name: "C8295 Elevated Crossover",
  segmentLength: 262,
  elevated: true,
});

// C8210 Straight Crossover — two 409 mm straights crossing at 90° at the same
// level. Segment length is the user's initial estimate (350 mm standard + 59 mm
// crossover extension); refine if a different split lands later.
export const c8210: PieceDef = makeCrossover({
  id: "c8210-straight-crossover",
  name: "C8210 Straight Crossover",
  segmentLength: 409,
  elevated: false,
});