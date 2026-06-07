import type { PieceDef, Connector } from "../types";

const NS = "http://www.w3.org/2000/svg";

const R = 292.5;          // centre-line radius (mm)
const W = 155;            // track width (mm)
const ANG_DEG = 45;       // 4 pieces = 180°
const BORDER = 0;        // border strip width (mm)
const SLOT_Y = 35;        // slot offset from centre (mm)
const RAIL_OFFSET = 2;    // rail offset from each slot (mm)

const ANG = (ANG_DEG * Math.PI) / 180;
const Ro = R + W / 2;     // 370 (outer radius)
const Ri = R - W / 2;     // 215 (inner radius)
const Rbo = R + W / 2 - BORDER / 2;  // outer border centre radius
const Rbi = R - W / 2 + BORDER / 2;  // inner border centre radius

const sin = Math.sin(ANG);
const cos = Math.cos(ANG);

const conn0: Connector = { pos: { x: 0, y: 0 }, angle: 180 };
const conn1: Connector = { pos: { x: R * sin, y: R * (1 - cos) }, angle: ANG_DEG };

export const curve: PieceDef = {
  id: "c8206-r2-curve",
  name: "C8206 R2 Curve (45°)",
  connectors: [conn0, conn1],
  rotateStep: ANG_DEG,
  bbox: { x: 0, y: -W / 2, w: Ro * sin, h: R - Ri * cos + W / 2 },
  render() {
    const oStart = { x: 0, y: -W / 2 };
    const iStart = { x: 0, y: +W / 2 };
    const oEnd = { x: Ro * sin, y: R - Ro * cos };
    const iEnd = { x: Ri * sin, y: R - Ri * cos };

    const body = document.createElementNS(NS, "path");
    body.setAttribute(
      "d",
      [
        `M ${oStart.x} ${oStart.y}`,
        `L ${iStart.x} ${iStart.y}`,
        `A ${Ri} ${Ri} 0 0 1 ${iEnd.x} ${iEnd.y}`,
        `L ${oEnd.x} ${oEnd.y}`,
        `A ${Ro} ${Ro} 0 0 0 ${oStart.x} ${oStart.y}`,
        `Z`,
      ].join(" "),
    );
    body.setAttribute("class", "body");

    const borderOuter = arcStroke(Rbo, "border", BORDER);
    const borderInner = arcStroke(Rbi, "border", BORDER);

    const slotOuter = arcStroke(R + SLOT_Y, "slot");
    const slotInner = arcStroke(R - SLOT_Y, "slot");

    const railOuterFar = arcStroke(R + SLOT_Y + RAIL_OFFSET, "rail");
    const railOuterNear = arcStroke(R + SLOT_Y - RAIL_OFFSET, "rail");
    const railInnerFar = arcStroke(R - SLOT_Y - RAIL_OFFSET, "rail");
    const railInnerNear = arcStroke(R - SLOT_Y + RAIL_OFFSET, "rail");

    return [
      body,
      borderOuter, borderInner,
      railOuterFar, railOuterNear, railInnerFar, railInnerNear,
      slotOuter, slotInner,
    ];
  },
};

function arcStroke(r: number, cls: string, width?: number): SVGPathElement {
  const path = document.createElementNS(NS, "path");
  path.setAttribute(
    "d",
    `M 0 ${R - r} A ${r} ${r} 0 0 1 ${r * sin} ${R - r * cos}`,
  );
  path.setAttribute("class", cls);
  if (width !== undefined) path.setAttribute("stroke-width", String(width));
  return path;
}