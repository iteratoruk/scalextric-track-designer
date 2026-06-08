import type { PieceDef } from "../types";

const NS = "http://www.w3.org/2000/svg";

const W = 155; // host track width (mm) — outer edge sits at centreRadius + W/2

interface BorderOptions {
  id: string;
  name: string;
  /** Centre-line radius of the host curve in mm (e.g. 136.5 for R1). The border's
   *  inner edge lands on the host's outer edge, centreRadius + W/2. */
  centreRadius: number;
  /** Arc angle in degrees — matches the host curve it borders. */
  angleDeg: number;
  /** Radial width of the kerb band in mm (how far it extends past the track edge). */
  width: number;
  /** Def-ids of the curves this border clips onto (its outer edge). */
  borderFor: string[];
}

/** An outer-edge border (kerb) accessory. Built in the SAME local frame as the
 *  matching curve (centre of curvature at (0, centreRadius)), so a placed border
 *  that shares its host's pos/rotation sits perfectly concentric on the outside. */
const RUMBLE_W = 10; // radial width of the red/white rumble strip (mm)
const STRIPE_DEG = 5; // approximate angular width of one rumble stripe

export function makeBorder(opts: BorderOptions): PieceDef {
  const { id, name, centreRadius: R, angleDeg, width, borderFor } = opts;
  const ANG = (angleDeg * Math.PI) / 180;
  const Rin = R + W / 2; // host outer edge — track side of the border
  const Rrumble = Rin + RUMBLE_W; // rumble/apron boundary
  const Rout = Rin + width;
  const sin = Math.sin(ANG);
  const cos = Math.cos(ANG);

  return {
    id,
    name,
    // No connectors: borders don't mate end-to-end, they snap concentrically.
    connectors: [],
    rotateStep: angleDeg,
    arc: { centreRadius: R, angleDeg },
    borderFor,
    bbox: { x: 0, y: R - Rout, w: Rout * sin, h: Rout - Rin * cos },
    render() {
      // A point at radius r and arc parameter a (radians from the start).
      const pt = (r: number, a: number) =>
        `${r * Math.sin(a)} ${R - r * Math.cos(a)}`;
      // An annular sector between radii [r0, r1] over angles [a0, a1].
      const sector = (r0: number, r1: number, a0: number, a1: number, cls: string) => {
        const path = document.createElementNS(NS, "path");
        path.setAttribute(
          "d",
          [
            `M ${pt(r0, a0)}`,
            `A ${r0} ${r0} 0 0 1 ${pt(r0, a1)}`,
            `L ${pt(r1, a1)}`,
            `A ${r1} ${r1} 0 0 0 ${pt(r1, a0)}`,
            `Z`,
          ].join(" "),
        );
        path.setAttribute("class", cls);
        return path;
      };

      // Sand run-off apron fills from the rumble strip out to the edge.
      const apron = sector(Rrumble, Rout, 0, ANG, "kerb-apron");

      // Red/white rumble strip hard against the track edge. An even stripe
      // count keeps the alternation continuous where two sections meet
      // (e.g. the two C8240s wrapping a 90° hairpin).
      let n = Math.max(2, Math.round(angleDeg / STRIPE_DEG));
      if (n % 2 === 1) n += 1;
      const step = ANG / n;
      const stripes = [];
      for (let i = 0; i < n; i++) {
        const cls = i % 2 === 0 ? "kerb-rumble-red" : "kerb-rumble-white";
        stripes.push(sector(Rin, Rrumble, i * step, (i + 1) * step, cls));
      }

      return [apron, ...stripes];
    },
  };
}

// C8240 R1 Outer Borders — 45° kerb on the outside of any R1 curve (outer edge
// 214 mm). Ships 4 per pack; here as one placeable 45° section. Fits the C8202
// 45° curve (one section) and the C8201 90° hairpin (two sections, side by side).
export const c8240: PieceDef = makeBorder({
  id: "c8240-r1-outer-border",
  name: "C8240 R1 Outer Border (45°)",
  centreRadius: 136.5,
  angleDeg: 45,
  width: 40,
  borderFor: ["c8202-r1-curve", "c8201-r1-hairpin"],
});

// C8228 R2 Outer Border, Kerb & Barrier — 45° kerb on the outside of any R2
// curve (outer edge 370 mm). Ships 4 per pack; here as one placeable 45°
// section. Fits the C8206 45° curve, the C8193 racing curve (R2 90°, two
// sections), and a run of two C8234 half-curves that together make a 45° bend.
export const c8228: PieceDef = makeBorder({
  id: "c8228-r2-outer-border",
  name: "C8228 R2 Outer Border (45°)",
  centreRadius: 292.5,
  angleDeg: 45,
  width: 40,
  borderFor: ["c8206-r2-curve", "c8193-racing-curve", "c8234-r2-half-curve"],
});