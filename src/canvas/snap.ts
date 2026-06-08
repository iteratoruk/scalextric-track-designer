import type { Placed, Connector, Vec } from "../types";
import { getDef } from "../catalogue";

export const SNAP_DISTANCE = 15;
// Borders snap by overlaying their local origin on the host's, so the catch
// radius can be more generous than end-to-end mating: there's exactly one
// valid placement per host and the whole band aligns at once.
export const BORDER_SNAP_DISTANCE = 50;
// Each degree of required rotation costs this many "millimetres" of score,
// so a near-pair that demands a 180° flip loses to a slightly farther pair
// that needs no rotation.
const ANGLE_WEIGHT_MM_PER_DEG = 0.08;

const D2R = Math.PI / 180;

export function rotate(v: Vec, angleDeg: number): Vec {
  const a = angleDeg * D2R;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  return { x: v.x * ca - v.y * sa, y: v.x * sa + v.y * ca };
}

export function worldConnector(piece: Placed, idx: number): Connector {
  const def = getDef(piece.defId);
  const local = def.connectors[idx];
  const r = rotate(local.pos, piece.rotation);
  return {
    pos: { x: piece.pos.x + r.x, y: piece.pos.y + r.y },
    angle: (local.angle + piece.rotation + 360) % 360,
  };
}

export type SingleSnap = {
  movingIdx: number;
  targetUid: string;
  targetIdx: number;
  newPos: Vec;
  newRotation: number;
};

function shortestAngle(target: number, current: number): number {
  const d = ((target - current) % 360 + 540) % 360 - 180;
  return d;
}

export function findSnap(moving: Placed, others: Placed[]): SingleSnap | null {
  let best: { score: number; res: SingleSnap } | null = null;
  const def = getDef(moving.defId);

  for (let movingIdx = 0; movingIdx < moving.mates.length; movingIdx++) {
    if (moving.mates[movingIdx]) continue;
    const movingWorld = worldConnector(moving, movingIdx);

    for (const other of others) {
      for (let targetIdx = 0; targetIdx < other.mates.length; targetIdx++) {
        if (other.mates[targetIdx]) continue;
        const targetWorld = worldConnector(other, targetIdx);
        const dist = Math.hypot(
          movingWorld.pos.x - targetWorld.pos.x,
          movingWorld.pos.y - targetWorld.pos.y,
        );
        if (dist > SNAP_DISTANCE) continue;

        const desiredAngle = (targetWorld.angle + 180) % 360;
        const delta = shortestAngle(desiredAngle, movingWorld.angle);
        const score = dist + ANGLE_WEIGHT_MM_PER_DEG * Math.abs(delta);

        const localConn = def.connectors[movingIdx];
        const newRotation = (desiredAngle - localConn.angle + 720) % 360;
        const r = rotate(localConn.pos, newRotation);
        const newPos = {
          x: targetWorld.pos.x - r.x,
          y: targetWorld.pos.y - r.y,
        };

        if (!best || score < best.score) {
          best = {
            score,
            res: { movingIdx, targetUid: other.uid, targetIdx, newPos, newRotation },
          };
        }
      }
    }
  }
  return best?.res ?? null;
}

export type BorderSnap = {
  borderUid: string;
  hostUid: string;
  pos: Vec;
  rotation: number;
};

type HostArc = {
  piece: Placed;
  cv: Vec; // centre of curvature, world
  lo: number; // start angle around cv (deg), unwrapped within its group
  hi: number; // end angle (lo + sweep)
};

const ANGLE_EPS = 1e-3;

/** Merge angular intervals into maximal contiguous runs (abutting curves form
 *  one run). Input need not be sorted; returns sorted, merged [lo, hi] runs. */
function mergeRuns(intervals: Array<[number, number]>): Array<[number, number]> {
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  const runs: Array<[number, number]> = [];
  for (const [lo, hi] of sorted) {
    const last = runs[runs.length - 1];
    if (last && lo <= last[1] + ANGLE_EPS) last[1] = Math.max(last[1], hi);
    else runs.push([lo, hi]);
  }
  return runs;
}

/** Find a host to clip a border onto. A border carries no connectors; it snaps
 *  concentrically onto pieces whose defId is in its `borderFor` list. The host
 *  arc can span several pieces: curves sharing a centre of curvature (joined
 *  smoothly, e.g. two R2 half-curves) merge into one continuous arc. A run
 *  longer than the border offers several section-sized slots, anchored at each
 *  section boundary; the border snaps to whichever slot it was dropped nearest.
 *  Each slot shares the host centre of curvature, so the kerb lands exactly on
 *  that section of the outer edge. */
export function findBorderSnap(border: Placed, others: Placed[]): BorderSnap | null {
  const def = getDef(border.defId);
  if (!def.borderFor || def.borderFor.length === 0 || !def.arc) return null;
  const bAng = def.arc.angleDeg;
  const bR = def.arc.centreRadius;

  // Candidate host arcs, keyed by shared centre of curvature.
  const groups = new Map<string, HostArc[]>();
  for (const other of others) {
    if (!def.borderFor.includes(other.defId)) continue;
    const hostDef = getDef(other.defId);
    if (!hostDef.arc) continue;
    const hc = rotate({ x: 0, y: hostDef.arc.centreRadius }, other.rotation);
    const cv = { x: other.pos.x + hc.x, y: other.pos.y + hc.y };
    const lo = (Math.atan2(other.pos.y - cv.y, other.pos.x - cv.x) * 180) / Math.PI;
    const key = `${Math.round(cv.x * 2)},${Math.round(cv.y * 2)}`;
    const arc: HostArc = { piece: other, cv, lo, hi: lo + hostDef.arc.angleDeg };
    const g = groups.get(key);
    if (g) g.push(arc);
    else groups.set(key, [arc]);
  }

  let best: { score: number; snap: BorderSnap } | null = null;
  for (const group of groups.values()) {
    const cv = group[0].cv;
    // Unwrap each arc's angle to sit within ±180° of the group reference, so a
    // run that crosses the atan2 ±180° seam still merges contiguously.
    const ref = group[0].lo;
    for (const a of group) {
      while (a.lo - ref > 180) { a.lo -= 360; a.hi -= 360; }
      while (a.lo - ref < -180) { a.lo += 360; a.hi += 360; }
    }
    const runs = mergeRuns(group.map((a) => [a.lo, a.hi]));
    const maxHi = Math.max(...runs.map((r) => r[1]));
    const covered = (lo: number, hi: number) =>
      runs.some(([rl, rh]) => lo >= rl - ANGLE_EPS && hi <= rh + ANGLE_EPS);

    // Slots step from each section boundary by the border's own arc, so a long
    // single piece (C8193) and a run of half-curves both expose every valid
    // placement. Dedup by start angle.
    const seen = new Set<number>();
    for (const a of group) {
      for (let phi = a.lo; phi + bAng <= maxHi + ANGLE_EPS; phi += bAng) {
        const k = Math.round(phi * 100);
        if (seen.has(k)) continue;
        seen.add(k);
        if (!covered(phi, phi + bAng)) continue;

        const rotation = ((phi + 90) % 360 + 360) % 360;
        const bc = rotate({ x: 0, y: bR }, rotation);
        const pos = { x: cv.x - bc.x, y: cv.y - bc.y };
        const dist = Math.hypot(border.pos.x - pos.x, border.pos.y - pos.y);
        if (dist > BORDER_SNAP_DISTANCE) continue;

        const angDelta = Math.abs(shortestAngle(rotation, border.rotation));
        const score = dist + ANGLE_WEIGHT_MM_PER_DEG * angDelta;
        if (!best || score < best.score) {
          // Attach to the section that holds the slot's start, so the border
          // rides along with that curve (and its connected run).
          const host =
            group.find((h) => phi >= h.lo - ANGLE_EPS && phi < h.hi - ANGLE_EPS) ??
            group[0];
          best = {
            score,
            snap: { borderUid: border.uid, hostUid: host.piece.uid, pos, rotation },
          };
        }
      }
    }
  }
  return best?.snap ?? null;
}

export type ChainSnap = {
  movingUid: string;
  movingIdx: number;
  targetUid: string;
  targetIdx: number;
  pivot: Vec;        // world position of the moving connector at snap time
  deltaAngle: number; // degrees to rotate the chain by, around pivot
  translation: Vec;  // additional translation after rotation
};

export function findChainSnap(
  insidePieces: Placed[],
  outsidePieces: Placed[],
): ChainSnap | null {
  let best: { score: number; snap: ChainSnap } | null = null;

  for (const moving of insidePieces) {
    for (let movingIdx = 0; movingIdx < moving.mates.length; movingIdx++) {
      if (moving.mates[movingIdx]) continue;
      const movingWorld = worldConnector(moving, movingIdx);

      for (const other of outsidePieces) {
        for (let targetIdx = 0; targetIdx < other.mates.length; targetIdx++) {
          if (other.mates[targetIdx]) continue;
          const targetWorld = worldConnector(other, targetIdx);
          const dist = Math.hypot(
            movingWorld.pos.x - targetWorld.pos.x,
            movingWorld.pos.y - targetWorld.pos.y,
          );
          if (dist > SNAP_DISTANCE) continue;

          const desiredAngle = (targetWorld.angle + 180) % 360;
          const deltaAngle = shortestAngle(desiredAngle, movingWorld.angle);
          const score = dist + ANGLE_WEIGHT_MM_PER_DEG * Math.abs(deltaAngle);

          if (!best || score < best.score) {
            best = {
              score,
              snap: {
                movingUid: moving.uid,
                movingIdx,
                targetUid: other.uid,
                targetIdx,
                pivot: movingWorld.pos,
                deltaAngle,
                translation: {
                  x: targetWorld.pos.x - movingWorld.pos.x,
                  y: targetWorld.pos.y - movingWorld.pos.y,
                },
              },
            };
          }
        }
      }
    }
  }
  return best?.snap ?? null;
}