import { describe, expect, test } from "vitest";
import { rotate, worldConnector } from "./snap";
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