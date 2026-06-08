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

/** Find a host piece to clip a border onto. A border carries no connectors; it
 *  snaps concentrically onto any nearby piece whose defId is in the border's
 *  `borderFor` list. A host arc longer than the border (e.g. the 90° C8201
 *  hairpin vs a 45° C8240) offers several section-sized slots around its outer
 *  edge; the border snaps to whichever slot it was dropped nearest. Each slot
 *  shares the host's centre of curvature, rotated by the slot's angular offset,
 *  so the kerb lands exactly on that section of the outer edge. */
export function findBorderSnap(border: Placed, others: Placed[]): BorderSnap | null {
  const def = getDef(border.defId);
  if (!def.borderFor || def.borderFor.length === 0 || !def.arc) return null;
  const bAng = def.arc.angleDeg;
  const bR = def.arc.centreRadius;

  let best: { score: number; snap: BorderSnap } | null = null;
  for (const other of others) {
    if (!def.borderFor.includes(other.defId)) continue;
    const hostDef = getDef(other.defId);
    if (!hostDef.arc) continue;

    // Host centre of curvature in world (local (0, centreRadius)).
    const hc = rotate({ x: 0, y: hostDef.arc.centreRadius }, other.rotation);
    const hostCv = { x: other.pos.x + hc.x, y: other.pos.y + hc.y };

    // One slot per border-sized section that fits within the host arc.
    const EPS = 1e-6;
    for (let phi = 0; phi + bAng <= hostDef.arc.angleDeg + EPS; phi += bAng) {
      const rotation = (other.rotation + phi + 720) % 360;
      const bc = rotate({ x: 0, y: bR }, rotation);
      const pos = { x: hostCv.x - bc.x, y: hostCv.y - bc.y };

      const dist = Math.hypot(border.pos.x - pos.x, border.pos.y - pos.y);
      if (dist > BORDER_SNAP_DISTANCE) continue;

      const angDelta = Math.abs(shortestAngle(rotation, border.rotation));
      const score = dist + ANGLE_WEIGHT_MM_PER_DEG * angDelta;
      if (!best || score < best.score) {
        best = {
          score,
          snap: { borderUid: border.uid, hostUid: other.uid, pos, rotation },
        };
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