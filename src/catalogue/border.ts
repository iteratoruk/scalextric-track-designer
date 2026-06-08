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

interface InnerBorderOptions {
  id: string;
  name: string;
  /** Centre-line radius of the host curve in mm. The border's outer edge lands
   *  on the host's inner edge, centreRadius − W/2. */
  centreRadius: number;
  /** Arc angle in degrees. */
  angleDeg: number;
  /** Radial width of the band in mm (same as the outer borders). */
  width: number;
  /** Def-ids of the curves this border clips onto (their inner edge). */
  borderFor: string[];
}

/** An inner-edge border. Built in the SAME local frame as the matching curve
 *  (centre of curvature at (0, centreRadius)), so it shares its host's
 *  pos/rotation and `findBorderSnap` places it concentrically — same as the
 *  outer borders, just rendered on the inside. It's the same radial width as
 *  the outer borders, hugging the inner track edge (it does NOT fill to the
 *  centre); the tight inner radius just leaves no room for a kerb, so it's a
 *  plain sand band — no rumble strip — scored at 22.5° break guides. */
export function makeInnerBorder(opts: InnerBorderOptions): PieceDef {
  const { id, name, centreRadius: R, angleDeg, width, borderFor } = opts;
  const ANG = (angleDeg * Math.PI) / 180;
  const Rout = R - W / 2; // host inner edge — track side of the band
  const Rin = Rout - width; // inner edge of the band (toward the centre)
  const sin = Math.sin(ANG);
  const cos = Math.cos(ANG);

  return {
    id,
    name,
    connectors: [],
    rotateStep: angleDeg,
    arc: { centreRadius: R, angleDeg },
    borderFor,
    bbox: { x: 0, y: R - Rout, w: Rout * sin, h: (R - Rin * cos) - (R - Rout) },
    render() {
      const pt = (r: number, a: number) =>
        `${r * Math.sin(a)} ${R - r * Math.cos(a)}`;

      // Annular sand band hugging the inner track edge — same width as the
      // outer borders, but no kerb (no room on a tight inner radius).
      const band = document.createElementNS(NS, "path");
      band.setAttribute(
        "d",
        [
          `M ${pt(Rin, 0)}`,
          `A ${Rin} ${Rin} 0 0 1 ${pt(Rin, ANG)}`,
          `L ${pt(Rout, ANG)}`,
          `A ${Rout} ${Rout} 0 0 0 ${pt(Rout, 0)}`,
          `Z`,
        ].join(" "),
      );
      band.setAttribute("class", "kerb-apron");

      // Score lines at 22.5° intervals — where the physical piece breaks apart.
      const guides = [];
      const GUIDE_DEG = 22.5;
      for (let a = GUIDE_DEG; a < angleDeg - 1e-6; a += GUIDE_DEG) {
        const rad = (a * Math.PI) / 180;
        const g = document.createElementNS(NS, "path");
        g.setAttribute("d", `M ${pt(Rin, rad)} L ${pt(Rout, rad)}`);
        g.setAttribute("class", "kerb-guide");
        guides.push(g);
      }

      return [band, ...guides];
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

// C8239 R2 Outer Border, Kerb & Barrier — the 22.5° half-section, for dressing
// R2 bends built from C8234 half-curves. Same R2 outer edge (370 mm) and host
// set as C8228; the finer arc just subdivides longer hosts into more slots.
export const c8239: PieceDef = makeBorder({
  id: "c8239-r2-outer-border-half",
  name: "C8239 R2 Outer Border (22.5°)",
  centreRadius: 292.5,
  angleDeg: 22.5,
  width: 40,
  borderFor: ["c8206-r2-curve", "c8193-racing-curve", "c8234-r2-half-curve"],
});

// C8224 R3 Outer Border, Kerb & Barrier — 22.5° kerb on the outside of the R3
// curve (outer edge 526 mm). R3 only ships as a 22.5° curve (C8204), so that's
// the lone host; a run of joined C8204s merges into one arc for more slots.
export const c8224: PieceDef = makeBorder({
  id: "c8224-r3-outer-border",
  name: "C8224 R3 Outer Border (22.5°)",
  centreRadius: 448.5,
  angleDeg: 22.5,
  width: 40,
  borderFor: ["c8204-r3-curve"],
});

// C8238 R4 Outer Border, Kerb & Barrier — 22.5° kerb on the outside of the R4
// curve (outer edge 682 mm). R4 only ships as a 22.5° curve (C8235), so that's
// the lone host; a run of joined C8235s merges into one arc for more slots.
export const c8238: PieceDef = makeBorder({
  id: "c8238-r4-outer-border",
  name: "C8238 R4 Outer Border (22.5°)",
  centreRadius: 604.5,
  angleDeg: 22.5,
  width: 40,
  borderFor: ["c8235-r4-curve"],
});

// C8279 R1 Inner Border, Kerb & Barrier — sits inside an R1 bend. The real
// piece is a 180° hairpin filler, scored at 22.5° so it snaps apart into up to
// 8 sections; modelled here as the practical 45° section (no 22.5° standard R1
// corner), mirroring the C8240 outer section. Same 40 mm width as the other
// borders, hugging the inner edge — just no kerb (no room on a tight radius).
export const c8279: PieceDef = makeInnerBorder({
  id: "c8279-r1-inner-border",
  name: "C8279 R1 Inner Border (45°)",
  centreRadius: 136.5,
  angleDeg: 45,
  width: 40,
  borderFor: ["c8202-r1-curve", "c8278-r1-half-curve", "c8201-r1-hairpin"],
});

// C8280 R2 Inner Border, Kerb & Barrier — 22.5° sand band on the inside of an
// R2 bend (inner edge 215 mm). R2 has more room than R1, so it's a slim band,
// not a wedge. Same R2 host set as the R2 outer borders (C8228 / C8239).
export const c8280: PieceDef = makeInnerBorder({
  id: "c8280-r2-inner-border",
  name: "C8280 R2 Inner Border (22.5°)",
  centreRadius: 292.5,
  angleDeg: 22.5,
  width: 40,
  borderFor: ["c8206-r2-curve", "c8193-racing-curve", "c8234-r2-half-curve"],
});

// C8225 R2 Inner Border, Kerb & Barrier — the 45° R2 inner section (inner edge
// 215 mm). Same R2 host set as C8280, one section per 45° bend.
export const c8225: PieceDef = makeInnerBorder({
  id: "c8225-r2-inner-border",
  name: "C8225 R2 Inner Border (45°)",
  centreRadius: 292.5,
  angleDeg: 45,
  width: 40,
  borderFor: ["c8206-r2-curve", "c8193-racing-curve", "c8234-r2-half-curve"],
});

// C8281 R3 Inner Border, Kerb & Barrier — 22.5° band on the inside of the R3
// curve (inner edge 371 mm). R3 only ships as the 22.5° C8204.
export const c8281: PieceDef = makeInnerBorder({
  id: "c8281-r3-inner-border",
  name: "C8281 R3 Inner Border (22.5°)",
  centreRadius: 448.5,
  angleDeg: 22.5,
  width: 40,
  borderFor: ["c8204-r3-curve"],
});

// C8282 R4 Inner Border, Kerb & Barrier — 22.5° band on the inside of the R4
// curve (inner edge 527 mm). R4 only ships as the 22.5° C8235.
export const c8282: PieceDef = makeInnerBorder({
  id: "c8282-r4-inner-border",
  name: "C8282 R4 Inner Border (22.5°)",
  centreRadius: 604.5,
  angleDeg: 22.5,
  width: 40,
  borderFor: ["c8235-r4-curve"],
});