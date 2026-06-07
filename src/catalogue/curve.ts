import type { PieceDef, Connector } from "../types";

const NS = "http://www.w3.org/2000/svg";

const W = 155;            // track width (mm) — matches C8205 standard straight
const BORDER = 0;         // border strip width (mm); kerbs ship as separate accessories
const SLOT_Y = 35;        // slot offset from centre line (mm)
const RAIL_OFFSET = 2;    // rail offset from each slot (mm)

interface CurveOptions {
  id: string;
  name: string;
  /** Centre-line radius in mm. Outer = centre + W/2, inner = centre − W/2. */
  centreRadius: number;
  /** Arc angle in degrees. */
  angleDeg: number;
  /** Rotation step for the R-key / rotation handles. Defaults to angleDeg. */
  rotateStep?: number;
}

export function makeCurve(opts: CurveOptions): PieceDef {
  const { id, name, centreRadius: R, angleDeg } = opts;
  const ANG = (angleDeg * Math.PI) / 180;
  const Ro = R + W / 2;
  const Ri = R - W / 2;
  const Rbo = R + W / 2 - BORDER / 2;
  const Rbi = R - W / 2 + BORDER / 2;
  const sin = Math.sin(ANG);
  const cos = Math.cos(ANG);

  const conn0: Connector = { pos: { x: 0, y: 0 }, angle: 180 };
  const conn1: Connector = { pos: { x: R * sin, y: R * (1 - cos) }, angle: angleDeg };

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

  return {
    id,
    name,
    connectors: [conn0, conn1],
    rotateStep: opts.rotateStep ?? angleDeg,
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
}

// R1 outer 214, inner 59, centre-line 136.5 mm.
export const c8202: PieceDef = makeCurve({
  id: "c8202-r1-curve",
  name: "C8202 R1 Curve (45°)",
  centreRadius: 136.5,
  angleDeg: 45,
});

// R1 half-angle: 8 pieces make a 180° hairpin (same as 4 × C8202).
export const c8278: PieceDef = makeCurve({
  id: "c8278-r1-half-curve",
  name: "C8278 R1 Half Curve (22.5°)",
  centreRadius: 136.5,
  angleDeg: 22.5,
});

// R2 outer 370, inner 215, centre-line 292.5 mm.
export const c8206: PieceDef = makeCurve({
  id: "c8206-r2-curve",
  name: "C8206 R2 Curve (45°)",
  centreRadius: 292.5,
  angleDeg: 45,
});

// R2 half-angle: 8 pieces make a 180° hairpin.
export const c8234: PieceDef = makeCurve({
  id: "c8234-r2-half-curve",
  name: "C8234 R2 Half Curve (22.5°)",
  centreRadius: 292.5,
  angleDeg: 22.5,
});