import type { PieceDef, Connector } from "../types";

const NS = "http://www.w3.org/2000/svg";

const LEN = 350;
const W = 155;
const BORDER = 0;
const SLOT_Y = 35;
const RAIL_OFFSET = 2;

const BORDER_CENTRE = W / 2 - BORDER / 2;

const conn0: Connector = { pos: { x: 0, y: 0 }, angle: 180 };
const conn1: Connector = { pos: { x: LEN, y: 0 }, angle: 0 };

export const straight: PieceDef = {
  id: "c8205-straight",
  name: "C8205 Standard Straight",
  connectors: [conn0, conn1],
  rotateStep: 90,
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