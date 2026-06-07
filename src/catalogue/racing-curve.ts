import type { PieceDef, Connector } from "../types";

const NS = "http://www.w3.org/2000/svg";

const W = 155;            // track width (mm) — matches every other piece
const BORDER = 0;
const SLOT_Y = 35;        // slot offset from centre line (mm)
const RAIL_OFFSET = 2;
const SAMPLES = 32;       // path sample points across the arc — smooth at any zoom

interface RacingCurveOptions {
  id: string;
  name: string;
  /** Centre-line radius in mm. Outer = centre + W/2, inner = centre − W/2. */
  centreRadius: number;
  /** Arc angle in degrees. */
  angleDeg: number;
  /** Rotation step for the R-key / rotation handles. Defaults to angleDeg. */
  rotateStep?: number;
}

/**
 * A "racing curve" body looks identical to a regular curve of the same radius
 * and arc, but the two slots cross over the centre line midway through the
 * arc — the slot that starts on the outside finishes on the inside (and vice
 * versa). The visual is the user-facing signal that this piece swaps lanes.
 */
export function makeRacingCurve(opts: RacingCurveOptions): PieceDef {
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

  /**
   * Sampled path along the arc, with the radius linearly interpolated from
   * `r0` (at θ=0) to `r1` (at θ=ANG). This is the curve the slot / rail
   * follows as it transitions between outer and inner.
   */
  function crossingPath(r0: number, r1: number, cls: string): SVGPathElement {
    const path = document.createElementNS(NS, "path");
    let d = "";
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const theta = t * ANG;
      const r = r0 + (r1 - r0) * t;
      const x = r * Math.sin(theta);
      const y = R - r * Math.cos(theta);
      d += (i === 0 ? "M " : " L ") + `${x.toFixed(3)} ${y.toFixed(3)}`;
    }
    path.setAttribute("d", d);
    path.setAttribute("class", cls);
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

      // Slot A: outer at conn0 → inner at conn1.
      // Slot B: inner at conn0 → outer at conn1. Slots cross at the arc midpoint.
      const slotA = crossingPath(R + SLOT_Y, R - SLOT_Y, "slot");
      const slotB = crossingPath(R - SLOT_Y, R + SLOT_Y, "slot");

      // Rails track each slot at ±RAIL_OFFSET radial offset, so they cross too.
      const railAOuter = crossingPath(R + SLOT_Y + RAIL_OFFSET, R - SLOT_Y + RAIL_OFFSET, "rail");
      const railAInner = crossingPath(R + SLOT_Y - RAIL_OFFSET, R - SLOT_Y - RAIL_OFFSET, "rail");
      const railBOuter = crossingPath(R - SLOT_Y + RAIL_OFFSET, R + SLOT_Y + RAIL_OFFSET, "rail");
      const railBInner = crossingPath(R - SLOT_Y - RAIL_OFFSET, R + SLOT_Y - RAIL_OFFSET, "rail");

      return [
        body,
        borderOuter, borderInner,
        railAOuter, railAInner, railBOuter, railBInner,
        slotA, slotB,
      ];
    },
  };
}

// C8193 Racing Curve — R2 90° (= 2 × standard C8206) with crossing slots.
// Pack contains 2 physically identical pieces; no narrowing/expanding pairing.
export const c8193: PieceDef = makeRacingCurve({
  id: "c8193-racing-curve",
  name: "C8193 Racing Curve",
  centreRadius: 292.5,
  angleDeg: 90,
});