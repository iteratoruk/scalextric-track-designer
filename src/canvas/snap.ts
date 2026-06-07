import type { Placed, Connector, Vec } from "../types";
import { getDef } from "../catalogue";

export const SNAP_DISTANCE = 15;
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