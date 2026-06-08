import { describe, expect, test } from "vitest";
import { rotate, worldConnector, findBorderSnap, BORDER_SNAP_DISTANCE } from "./snap";
import { getDef } from "../catalogue";
import type { Placed } from "../types";

const placed = (overrides: Partial<Placed> = {}): Placed => ({
  uid: "test",
  defId: "c8205-straight",
  pos: { x: 0, y: 0 },
  rotation: 0,
  mates: [null, null],
  ...overrides,
});

describe("rotate", () => {
  test("(1, 0) rotated 0° is unchanged", () => {
    const r = rotate({ x: 1, y: 0 }, 0);
    expect(r.x).toBeCloseTo(1);
    expect(r.y).toBeCloseTo(0);
  });

  test("(1, 0) rotated 90° (screen-CW) → (0, 1)", () => {
    const r = rotate({ x: 1, y: 0 }, 90);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(1);
  });

  test("(1, 0) rotated 180° → (-1, 0)", () => {
    const r = rotate({ x: 1, y: 0 }, 180);
    expect(r.x).toBeCloseTo(-1);
    expect(r.y).toBeCloseTo(0);
  });
});

describe("worldConnector — C8205 standard straight", () => {
  test("conn 0 at origin with no rotation sits at the piece position pointing west", () => {
    const c = worldConnector(placed({ pos: { x: 100, y: 50 } }), 0);
    expect(c.pos.x).toBeCloseTo(100);
    expect(c.pos.y).toBeCloseTo(50);
    expect(c.angle).toBe(180);
  });

  test("conn 1 sits 350 mm east of the piece position pointing east", () => {
    const c = worldConnector(placed({ pos: { x: 100, y: 50 } }), 1);
    expect(c.pos.x).toBeCloseTo(450);
    expect(c.pos.y).toBeCloseTo(50);
    expect(c.angle).toBe(0);
  });

  test("a 90° rotation rotates conn 1 into the +y direction", () => {
    const c = worldConnector(placed({ rotation: 90 }), 1);
    expect(c.pos.x).toBeCloseTo(0);
    expect(c.pos.y).toBeCloseTo(350);
    expect(c.angle).toBe(90);
  });
});

describe("worldConnector — C8206 R2 curve (45°)", () => {
  test("four R2 curves snapped in a chain close to (0, 2R)", () => {
    // Mathematical sanity check: four R2 curves of 45° at centre-line radius
    // 292.5 mm should bring conn 1 of the fourth piece to (0, 585) with world
    // angle 180°. Validated analytically in the design notes.
    const R = 292.5;
    const sin = Math.sin(Math.PI / 4);
    const cos = Math.cos(Math.PI / 4);

    // Piece 1: rotation 0
    const p1 = placed({ defId: "c8206-r2-curve", rotation: 0 });
    const c1 = worldConnector(p1, 1);
    expect(c1.pos.x).toBeCloseTo(R * sin);
    expect(c1.pos.y).toBeCloseTo(R * (1 - cos));
    expect(c1.angle).toBe(45);

    // Piece 2: snapped to piece 1, rotated 45°
    const p2 = placed({
      defId: "c8206-r2-curve",
      pos: c1.pos,
      rotation: 45,
    });
    const c2 = worldConnector(p2, 1);
    expect(c2.pos.x).toBeCloseTo(R);
    expect(c2.pos.y).toBeCloseTo(R);
    expect(c2.angle).toBe(90);
  });
});

describe("C8240 R1 outer border def", () => {
  test("carries no connectors and clips to the R1 curve and hairpin", () => {
    const def = getDef("c8240-r1-outer-border");
    expect(def.connectors).toEqual([]);
    expect(def.borderFor).toEqual(["c8202-r1-curve", "c8201-r1-hairpin"]);
    expect(def.rotateStep).toBe(45);
  });

  test("inner edge lands on the C8202 outer edge (y = -77.5 at the start)", () => {
    // Built in the host's local frame: inner radius = 136.5 + 155/2 = 214, so
    // the band's top-left corner matches the curve's outer corner at (0, -77.5).
    const def = getDef("c8240-r1-outer-border");
    expect(def.bbox.y).toBeCloseTo(136.5 - 254); // outer radius 254 → top of band
  });
});

describe("findBorderSnap", () => {
  const border = (overrides: Partial<Placed> = {}): Placed => ({
    uid: "b1",
    defId: "c8240-r1-outer-border",
    pos: { x: 0, y: 0 },
    rotation: 0,
    mates: [],
    ...overrides,
  });
  const r1Curve = (overrides: Partial<Placed> = {}): Placed => ({
    uid: "c1",
    defId: "c8202-r1-curve",
    pos: { x: 1000, y: 500 },
    rotation: 90,
    mates: [null, null],
    ...overrides,
  });

  test("snaps a nearby border concentrically onto an R1 curve (host pos + rotation)", () => {
    const host = r1Curve();
    const dropped = border({ pos: { x: 1010, y: 495 }, rotation: 0 });
    const snap = findBorderSnap(dropped, [host]);
    expect(snap).not.toBeNull();
    expect(snap!.hostUid).toBe("c1");
    expect(snap!.pos).toEqual(host.pos);
    expect(snap!.rotation).toBe(90);
  });

  test("does not snap when the border is beyond the catch radius", () => {
    const host = r1Curve();
    const far = border({ pos: { x: 1000 + BORDER_SNAP_DISTANCE + 1, y: 500 } });
    expect(findBorderSnap(far, [host])).toBeNull();
  });

  test("ignores curves it is not a border for (e.g. R2)", () => {
    const r2 = r1Curve({ uid: "c2", defId: "c8206-r2-curve" });
    const dropped = border({ pos: { x: 1005, y: 500 } });
    expect(findBorderSnap(dropped, [r2])).toBeNull();
  });

  test("a non-border piece never produces a border snap", () => {
    const notABorder = border({ defId: "c8202-r1-curve", mates: [null, null] });
    expect(findBorderSnap(notABorder, [r1Curve()])).toBeNull();
  });

  describe("on a 90° C8201 hairpin: two side-by-side 45° slots", () => {
    // Hairpin at (1000, 500), rotation 0. Centre of curvature at (1000, 636.5).
    // Slot 0 covers 0–45° (rotation 0, origin = host origin); slot 1 covers
    // 45–90° (rotation 45, origin offset around the shared centre).
    const hairpin = (): Placed => ({
      uid: "h1",
      defId: "c8201-r1-hairpin",
      pos: { x: 1000, y: 500 },
      rotation: 0,
      mates: [null, null],
    });
    const SIN45 = Math.sin(Math.PI / 4);
    const slot1 = { x: 1000 + 136.5 * SIN45, y: 636.5 - 136.5 * SIN45 };

    test("dropped near the first section → rotation 0 at the host origin", () => {
      const snap = findBorderSnap(border({ pos: { x: 1005, y: 500 } }), [hairpin()]);
      expect(snap).not.toBeNull();
      expect(snap!.rotation).toBe(0);
      expect(snap!.pos.x).toBeCloseTo(1000);
      expect(snap!.pos.y).toBeCloseTo(500);
    });

    test("dropped near the second section → rotation 45 at the offset slot", () => {
      const snap = findBorderSnap(border({ pos: slot1, rotation: 45 }), [hairpin()]);
      expect(snap).not.toBeNull();
      expect(snap!.rotation).toBe(45);
      expect(snap!.pos.x).toBeCloseTo(slot1.x);
      expect(snap!.pos.y).toBeCloseTo(slot1.y);
    });

    test("the two slots are distinct placements", () => {
      const s0 = findBorderSnap(border({ pos: { x: 1000, y: 500 } }), [hairpin()])!;
      const s1 = findBorderSnap(border({ pos: slot1, rotation: 45 }), [hairpin()])!;
      expect(s0.rotation).not.toBe(s1.rotation);
      expect(Math.hypot(s0.pos.x - s1.pos.x, s0.pos.y - s1.pos.y)).toBeGreaterThan(50);
    });
  });
});

describe("C8228 R2 outer border", () => {
  const R = 292.5;
  const SIN45 = Math.sin(Math.PI / 4);
  const SIN225 = Math.sin(Math.PI / 8);
  const COS225 = Math.cos(Math.PI / 8);

  const border = (overrides: Partial<Placed> = {}): Placed => ({
    uid: "b1",
    defId: "c8228-r2-outer-border",
    pos: { x: 0, y: 0 },
    rotation: 0,
    mates: [],
    ...overrides,
  });

  test("def: no connectors, R2 arc, three host types", () => {
    const def = getDef("c8228-r2-outer-border");
    expect(def.connectors).toEqual([]);
    expect(def.arc).toEqual({ centreRadius: 292.5, angleDeg: 45 });
    expect(def.borderFor).toEqual([
      "c8206-r2-curve",
      "c8193-racing-curve",
      "c8234-r2-half-curve",
    ]);
  });

  test("snaps onto a single C8206 (one 45° section)", () => {
    const host: Placed = {
      uid: "c1", defId: "c8206-r2-curve", pos: { x: 500, y: 400 }, rotation: 0, mates: [null, null],
    };
    const snap = findBorderSnap(border({ pos: { x: 505, y: 403 } }), [host]);
    expect(snap).not.toBeNull();
    expect(snap!.hostUid).toBe("c1");
    expect(snap!.rotation).toBe(0);
    expect(snap!.pos.x).toBeCloseTo(500);
    expect(snap!.pos.y).toBeCloseTo(400);
  });

  test("offers two slots on the C8193 racing curve (R2, 90°)", () => {
    const rc: Placed = {
      uid: "rc", defId: "c8193-racing-curve", pos: { x: 0, y: 0 }, rotation: 0, mates: [null, null],
    };
    const s0 = findBorderSnap(border({ pos: { x: 3, y: 2 } }), [rc])!;
    expect(s0.rotation).toBe(0);
    expect(s0.pos.x).toBeCloseTo(0);
    expect(s0.pos.y).toBeCloseTo(0);

    const slot1 = { x: R * SIN45, y: R - R * SIN45 };
    const s1 = findBorderSnap(border({ pos: slot1, rotation: 45 }), [rc])!;
    expect(s1.rotation).toBe(45);
    expect(s1.pos.x).toBeCloseTo(slot1.x);
    expect(s1.pos.y).toBeCloseTo(slot1.y);
  });

  describe("two joined C8234 half-curves form one 45° host", () => {
    // Half-curve A at origin, B mated to A's far end and rotated 22.5° — a
    // smooth R2 bend. They share a centre of curvature at (0, 292.5).
    const halfA: Placed = {
      uid: "a", defId: "c8234-r2-half-curve", pos: { x: 0, y: 0 }, rotation: 0, mates: [null, { uid: "b", connectorIdx: 0 }],
    };
    const halfB: Placed = {
      uid: "b",
      defId: "c8234-r2-half-curve",
      pos: { x: R * SIN225, y: R * (1 - COS225) },
      rotation: 22.5,
      mates: [{ uid: "a", connectorIdx: 1 }, null],
    };

    test("a 45° border snaps across both halves, anchored on the first", () => {
      const snap = findBorderSnap(border({ pos: { x: 4, y: 2 } }), [halfA, halfB]);
      expect(snap).not.toBeNull();
      expect(snap!.rotation).toBe(0);
      expect(snap!.pos.x).toBeCloseTo(0);
      expect(snap!.pos.y).toBeCloseTo(0);
      expect(snap!.hostUid).toBe("a"); // start section owns the border
    });

    test("a lone half-curve (22.5°) is too short — no snap", () => {
      expect(findBorderSnap(border({ pos: { x: 0, y: 0 } }), [halfA])).toBeNull();
    });
  });
});