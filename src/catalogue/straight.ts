import type { PieceDef, Connector } from "../types";

const NS = "http://www.w3.org/2000/svg";

const W = 155;            // track width (mm) — matches every other piece
const BORDER = 0;
const SLOT_Y = 35;
const RAIL_OFFSET = 2;

const BORDER_CENTRE = W / 2 - BORDER / 2;

interface StraightOptions {
  id: string;
  name: string;
  /** Length along the long axis, in mm. */
  length: number;
  /** Rotation step for the R-key / rotation handles. Defaults to 90°. */
  rotateStep?: number;
}

export function makeStraight(opts: StraightOptions): PieceDef {
  const { id, name, length: LEN } = opts;
  const conn0: Connector = { pos: { x: 0, y: 0 }, angle: 180 };
  const conn1: Connector = { pos: { x: LEN, y: 0 }, angle: 0 };

  return {
    id,
    name,
    connectors: [conn0, conn1],
    rotateStep: opts.rotateStep ?? 90,
    bbox: { x: 0, y: -W / 2, w: LEN, h: W },
    render() {
      const body = document.createElementNS(NS, "rect");
      body.setAttribute("x", "0");
      body.setAttribute("y", String(-W / 2));
      body.setAttribute("width", String(LEN));
      body.setAttribute("height", String(W));
      body.setAttribute("class", "body");

      const borderTop = strokeLine(0, -BORDER_CENTRE, LEN, -BORDER_CENTRE, "border", BORDER);
      const borderBot = strokeLine(0, BORDER_CENTRE, LEN, BORDER_CENTRE, "border", BORDER);

      const slotTop = strokeLine(0, -SLOT_Y, LEN, -SLOT_Y, "slot");
      const slotBot = strokeLine(0, SLOT_Y, LEN, SLOT_Y, "slot");

      const railTopOuter = strokeLine(0, -SLOT_Y - RAIL_OFFSET, LEN, -SLOT_Y - RAIL_OFFSET, "rail");
      const railTopInner = strokeLine(0, -SLOT_Y + RAIL_OFFSET, LEN, -SLOT_Y + RAIL_OFFSET, "rail");
      const railBotOuter = strokeLine(0, SLOT_Y + RAIL_OFFSET, LEN, SLOT_Y + RAIL_OFFSET, "rail");
      const railBotInner = strokeLine(0, SLOT_Y - RAIL_OFFSET, LEN, SLOT_Y - RAIL_OFFSET, "rail");

      return [
        body,
        borderTop, borderBot,
        railTopOuter, railTopInner, railBotOuter, railBotInner,
        slotTop, slotBot,
      ];
    },
  };
}

function strokeLine(
  x1: number, y1: number, x2: number, y2: number,
  cls: string, width?: number,
): SVGLineElement {
  const l = document.createElementNS(NS, "line");
  l.setAttribute("x1", String(x1));
  l.setAttribute("x2", String(x2));
  l.setAttribute("y1", String(y1));
  l.setAttribute("y2", String(y2));
  l.setAttribute("class", cls);
  if (width !== undefined) l.setAttribute("stroke-width", String(width));
  return l;
}

// C8205 Standard Straight — 350 mm.
export const c8205: PieceDef = makeStraight({
  id: "c8205-straight",
  name: "C8205 Standard Straight",
  length: 350,
});

// C8222 Half Straight — 175 mm (= 1/2 of C8205).
export const c8222: PieceDef = makeStraight({
  id: "c8222-half-straight",
  name: "C8222 Half Straight",
  length: 175,
});

// C8200 Quarter Straight — 87 mm.
export const c8200: PieceDef = makeStraight({
  id: "c8200-quarter-straight",
  name: "C8200 Quarter Straight",
  length: 87,
});

// C8236 Short Straight — 78 mm.
export const c8236: PieceDef = makeStraight({
  id: "c8236-short-straight",
  name: "C8236 Short Straight",
  length: 78,
});