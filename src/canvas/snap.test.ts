import { describe, expect, test } from "vitest";
import { rotate, worldConnector, findBorderSnap, BORDER_SNAP_DISTANCE } from "./snap";
import { getDef } from "../catalogue";
import type { Placed, Vec } from "../types";

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

describe("C8239 R2 outer border (22.5° half-section)", () => {
  const R = 292.5;
  const SIN225 = Math.sin(Math.PI / 8);
  const COS225 = Math.cos(Math.PI / 8);

  const border = (overrides: Partial<Placed> = {}): Placed => ({
    uid: "b1",
    defId: "c8239-r2-outer-border-half",
    pos: { x: 0, y: 0 },
    rotation: 0,
    mates: [],
    ...overrides,
  });

  test("def: no connectors, 22.5° R2 arc, same R2 hosts as C8228", () => {
    const def = getDef("c8239-r2-outer-border-half");
    expect(def.connectors).toEqual([]);
    expect(def.arc).toEqual({ centreRadius: 292.5, angleDeg: 22.5 });
    expect(def.borderFor).toEqual([
      "c8206-r2-curve",
      "c8193-racing-curve",
      "c8234-r2-half-curve",
    ]);
  });

  test("snaps onto a single C8234 half-curve (one 22.5° section)", () => {
    const half: Placed = {
      uid: "h", defId: "c8234-r2-half-curve", pos: { x: 200, y: 100 }, rotation: 0, mates: [null, null],
    };
    const snap = findBorderSnap(border({ pos: { x: 203, y: 102 } }), [half]);
    expect(snap).not.toBeNull();
    expect(snap!.hostUid).toBe("h");
    expect(snap!.rotation).toBe(0);
    expect(snap!.pos.x).toBeCloseTo(200);
    expect(snap!.pos.y).toBeCloseTo(100);
  });

  test("subdivides a 45° C8206 into two 22.5° slots", () => {
    const host: Placed = {
      uid: "c", defId: "c8206-r2-curve", pos: { x: 0, y: 0 }, rotation: 0, mates: [null, null],
    };
    const s0 = findBorderSnap(border({ pos: { x: 3, y: 2 } }), [host])!;
    expect(s0.rotation).toBe(0);
    expect(s0.pos.x).toBeCloseTo(0);
    expect(s0.pos.y).toBeCloseTo(0);

    // Second slot starts a half-curve along the arc — rotation 22.5°.
    const slot1 = { x: R * SIN225, y: R * (1 - COS225) };
    const s1 = findBorderSnap(border({ pos: slot1, rotation: 22.5 }), [host])!;
    expect(s1.rotation).toBeCloseTo(22.5);
    expect(s1.pos.x).toBeCloseTo(slot1.x);
    expect(s1.pos.y).toBeCloseTo(slot1.y);
  });
});

describe("C8224 R3 outer border (22.5°)", () => {
  const border = (overrides: Partial<Placed> = {}): Placed => ({
    uid: "b1",
    defId: "c8224-r3-outer-border",
    pos: { x: 0, y: 0 },
    rotation: 0,
    mates: [],
    ...overrides,
  });

  test("def: no connectors, R3 arc, fits the C8204 R3 curve", () => {
    const def = getDef("c8224-r3-outer-border");
    expect(def.connectors).toEqual([]);
    expect(def.arc).toEqual({ centreRadius: 448.5, angleDeg: 22.5 });
    expect(def.borderFor).toEqual(["c8204-r3-curve"]);
  });

  test("snaps concentrically onto a C8204 R3 curve", () => {
    const host: Placed = {
      uid: "c", defId: "c8204-r3-curve", pos: { x: 300, y: 150 }, rotation: 90, mates: [null, null],
    };
    const snap = findBorderSnap(border({ pos: { x: 304, y: 153 } }), [host]);
    expect(snap).not.toBeNull();
    expect(snap!.hostUid).toBe("c");
    expect(snap!.rotation).toBe(90);
    expect(snap!.pos.x).toBeCloseTo(300);
    expect(snap!.pos.y).toBeCloseTo(150);
  });

  test("does not snap onto an R2 curve (wrong radius/host)", () => {
    const r2: Placed = {
      uid: "x", defId: "c8206-r2-curve", pos: { x: 304, y: 153 }, rotation: 90, mates: [null, null],
    };
    expect(findBorderSnap(border({ pos: { x: 304, y: 153 } }), [r2])).toBeNull();
  });
});

describe("C8238 R4 outer border (22.5°)", () => {
  const border = (overrides: Partial<Placed> = {}): Placed => ({
    uid: "b1",
    defId: "c8238-r4-outer-border",
    pos: { x: 0, y: 0 },
    rotation: 0,
    mates: [],
    ...overrides,
  });

  test("def: no connectors, R4 arc, fits the C8235 R4 curve", () => {
    const def = getDef("c8238-r4-outer-border");
    expect(def.connectors).toEqual([]);
    expect(def.arc).toEqual({ centreRadius: 604.5, angleDeg: 22.5 });
    expect(def.borderFor).toEqual(["c8235-r4-curve"]);
  });

  test("snaps concentrically onto a C8235 R4 curve", () => {
    const host: Placed = {
      uid: "c", defId: "c8235-r4-curve", pos: { x: -200, y: 600 }, rotation: 135, mates: [null, null],
    };
    const snap = findBorderSnap(border({ pos: { x: -196, y: 603 } }), [host]);
    expect(snap).not.toBeNull();
    expect(snap!.hostUid).toBe("c");
    expect(snap!.rotation).toBe(135);
    expect(snap!.pos.x).toBeCloseTo(-200);
    expect(snap!.pos.y).toBeCloseTo(600);
  });
});

describe("C8279 R1 inner border (45° section)", () => {
  const border = (overrides: Partial<Placed> = {}): Placed => ({
    uid: "b1",
    defId: "c8279-r1-inner-border",
    pos: { x: 0, y: 0 },
    rotation: 0,
    mates: [],
    ...overrides,
  });

  test("def: no connectors, R1 arc, fits R1 curve/half/hairpin", () => {
    const def = getDef("c8279-r1-inner-border");
    expect(def.connectors).toEqual([]);
    expect(def.arc).toEqual({ centreRadius: 136.5, angleDeg: 45 });
    expect(def.borderFor).toEqual([
      "c8202-r1-curve",
      "c8278-r1-half-curve",
      "c8201-r1-hairpin",
    ]);
  });

  test("snaps concentrically onto a C8202 (shares pos + rotation, inner edge)", () => {
    // Same concentric placement as the outer border — the render puts it inside.
    const host: Placed = {
      uid: "c", defId: "c8202-r1-curve", pos: { x: 400, y: 300 }, rotation: 0, mates: [null, null],
    };
    const snap = findBorderSnap(border({ pos: { x: 403, y: 302 } }), [host]);
    expect(snap).not.toBeNull();
    expect(snap!.hostUid).toBe("c");
    expect(snap!.rotation).toBe(0);
    expect(snap!.pos.x).toBeCloseTo(400);
    expect(snap!.pos.y).toBeCloseTo(300);
  });

  test("offers two slots on the C8201 hairpin (90°)", () => {
    const hp: Placed = {
      uid: "h", defId: "c8201-r1-hairpin", pos: { x: 0, y: 0 }, rotation: 0, mates: [null, null],
    };
    const s0 = findBorderSnap(border({ pos: { x: 2, y: 1 } }), [hp])!;
    expect(s0.rotation).toBe(0);
    const SIN45 = Math.sin(Math.PI / 4);
    const slot1 = { x: 136.5 * SIN45, y: 136.5 - 136.5 * SIN45 };
    const s1 = findBorderSnap(border({ pos: slot1, rotation: 45 }), [hp])!;
    expect(s1.rotation).toBe(45);
    expect(s1.pos.x).toBeCloseTo(slot1.x);
    expect(s1.pos.y).toBeCloseTo(slot1.y);
  });
});

describe("C8280 R2 inner border (22.5°)", () => {
  const border = (overrides: Partial<Placed> = {}): Placed => ({
    uid: "b1",
    defId: "c8280-r2-inner-border",
    pos: { x: 0, y: 0 },
    rotation: 0,
    mates: [],
    ...overrides,
  });

  test("def: no connectors, 22.5° R2 arc, same R2 hosts as C8228/C8239", () => {
    const def = getDef("c8280-r2-inner-border");
    expect(def.connectors).toEqual([]);
    expect(def.arc).toEqual({ centreRadius: 292.5, angleDeg: 22.5 });
    expect(def.borderFor).toEqual([
      "c8206-r2-curve",
      "c8193-racing-curve",
      "c8234-r2-half-curve",
    ]);
  });

  test("snaps concentrically onto a single C8234 R2 half-curve", () => {
    const host: Placed = {
      uid: "c", defId: "c8234-r2-half-curve", pos: { x: 120, y: 80 }, rotation: 0, mates: [null, null],
    };
    const snap = findBorderSnap(border({ pos: { x: 123, y: 82 } }), [host]);
    expect(snap).not.toBeNull();
    expect(snap!.hostUid).toBe("c");
    expect(snap!.rotation).toBe(0);
    expect(snap!.pos.x).toBeCloseTo(120);
    expect(snap!.pos.y).toBeCloseTo(80);
  });

  test("subdivides a 45° C8206 into two 22.5° inner slots", () => {
    const host: Placed = {
      uid: "c", defId: "c8206-r2-curve", pos: { x: 0, y: 0 }, rotation: 0, mates: [null, null],
    };
    const s0 = findBorderSnap(border({ pos: { x: 3, y: 2 } }), [host])!;
    expect(s0.rotation).toBe(0);
    const SIN225 = Math.sin(Math.PI / 8);
    const COS225 = Math.cos(Math.PI / 8);
    const slot1 = { x: 292.5 * SIN225, y: 292.5 * (1 - COS225) };
    const s1 = findBorderSnap(border({ pos: slot1, rotation: 22.5 }), [host])!;
    expect(s1.rotation).toBeCloseTo(22.5);
    expect(s1.pos.x).toBeCloseTo(slot1.x);
    expect(s1.pos.y).toBeCloseTo(slot1.y);
  });
});

describe("inner borders across radii (C8225 / C8281 / C8282)", () => {
  const place = (defId: string, host: Placed, near: Vec) =>
    findBorderSnap(
      { uid: "b", defId, pos: near, rotation: host.rotation, mates: [] },
      [host],
    );

  test("C8225 R2 (45°): def + concentric snap onto a C8206", () => {
    const def = getDef("c8225-r2-inner-border");
    expect(def.arc).toEqual({ centreRadius: 292.5, angleDeg: 45 });
    expect(def.borderFor).toEqual([
      "c8206-r2-curve", "c8193-racing-curve", "c8234-r2-half-curve",
    ]);
    const host: Placed = {
      uid: "c", defId: "c8206-r2-curve", pos: { x: 50, y: 60 }, rotation: 0, mates: [null, null],
    };
    const snap = place("c8225-r2-inner-border", host, { x: 53, y: 62 })!;
    expect(snap.hostUid).toBe("c");
    expect(snap.rotation).toBe(0);
    expect(snap.pos.x).toBeCloseTo(50);
    expect(snap.pos.y).toBeCloseTo(60);
  });

  test("C8281 R3 (22.5°): def + concentric snap onto a C8204", () => {
    const def = getDef("c8281-r3-inner-border");
    expect(def.arc).toEqual({ centreRadius: 448.5, angleDeg: 22.5 });
    expect(def.borderFor).toEqual(["c8204-r3-curve"]);
    const host: Placed = {
      uid: "c", defId: "c8204-r3-curve", pos: { x: 10, y: 20 }, rotation: 45, mates: [null, null],
    };
    const snap = place("c8281-r3-inner-border", host, { x: 13, y: 22 })!;
    expect(snap.hostUid).toBe("c");
    expect(snap.rotation).toBe(45);
    expect(snap.pos.x).toBeCloseTo(10);
    expect(snap.pos.y).toBeCloseTo(20);
  });

  test("C8282 R4 (22.5°): def + concentric snap onto a C8235", () => {
    const def = getDef("c8282-r4-inner-border");
    expect(def.arc).toEqual({ centreRadius: 604.5, angleDeg: 22.5 });
    expect(def.borderFor).toEqual(["c8235-r4-curve"]);
    const host: Placed = {
      uid: "c", defId: "c8235-r4-curve", pos: { x: -30, y: 5 }, rotation: 90, mates: [null, null],
    };
    const snap = place("c8282-r4-inner-border", host, { x: -27, y: 7 })!;
    expect(snap.hostUid).toBe("c");
    expect(snap.rotation).toBe(90);
    expect(snap.pos.x).toBeCloseTo(-30);
    expect(snap.pos.y).toBeCloseTo(5);
  });
});

describe("C8223 half-straight border (edge snap)", () => {
  const border = (overrides: Partial<Placed> = {}): Placed => ({
    uid: "b1",
    defId: "c8223-half-straight-border",
    pos: { x: 0, y: 0 },
    rotation: 0,
    mates: [],
    ...overrides,
  });
  const straight = (uid: string, defId: string, pos: Vec, rotation = 0): Placed => ({
    uid, defId, pos, rotation, mates: [null, null],
  });

  test("def: no connectors, straight marker, no arc", () => {
    const def = getDef("c8223-half-straight-border");
    expect(def.connectors).toEqual([]);
    expect(def.straight).toEqual({ length: 175 });
    expect(def.arc).toBeUndefined();
    expect(def.borderFor).toContain("c8205-straight");
  });

  test("two length slots along a standard straight (top edge)", () => {
    const host = straight("s", "c8205-straight", { x: 100, y: 200 });
    const s0 = findBorderSnap(border({ pos: { x: 103, y: 201 } }), [host])!;
    expect(s0.hostUid).toBe("s");
    expect(s0.rotation).toBe(0);
    expect(s0.pos.x).toBeCloseTo(100);
    expect(s0.pos.y).toBeCloseTo(200);

    const s1 = findBorderSnap(border({ pos: { x: 273, y: 201 } }), [host])!;
    expect(s1.rotation).toBe(0);
    expect(s1.pos.x).toBeCloseTo(275); // second half, 175 mm along
    expect(s1.pos.y).toBeCloseTo(200);
  });

  test("snaps to the far/bottom edge with a 180° flip", () => {
    const host = straight("s", "c8205-straight", { x: 100, y: 200 });
    // The only slot within range of the far end is the bottom-edge placement.
    const snap = findBorderSnap(border({ pos: { x: 448, y: 202 }, rotation: 180 }), [host])!;
    expect(snap.rotation).toBe(180);
    expect(snap.pos.x).toBeCloseTo(450);
    expect(snap.pos.y).toBeCloseTo(200);
  });

  test("spans a run of two collinear half-straights regardless of composition", () => {
    const a = straight("a", "c8222-half-straight", { x: 0, y: 0 });
    const b = straight("b", "c8222-half-straight", { x: 175, y: 0 });
    const s0 = findBorderSnap(border({ pos: { x: 4, y: 2 } }), [a, b])!;
    expect(s0.hostUid).toBe("a");
    expect(s0.pos.x).toBeCloseTo(0);
    const s1 = findBorderSnap(border({ pos: { x: 178, y: 1 } }), [a, b])!;
    expect(s1.hostUid).toBe("b");
    expect(s1.pos.x).toBeCloseTo(175);
  });

  test("does not snap to a straight shorter than the border", () => {
    const quarter = straight("q", "c8200-quarter-straight", { x: 0, y: 0 }); // 87 mm
    expect(findBorderSnap(border({ pos: { x: 0, y: 0 } }), [quarter])).toBeNull();
  });
});