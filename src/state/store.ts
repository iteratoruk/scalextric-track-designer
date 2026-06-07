import type { Placed, Track, Mate } from "../types";

const DEFAULT_ROOM = { w: 4000, h: 3000 };

type State = {
  track: Track;
  selectedUid: string | null;
};

type Listener = (state: State) => void;

const state: State = {
  track: { version: 1, name: "untitled", room: { ...DEFAULT_ROOM }, pieces: [] },
  selectedUid: null,
};

const listeners = new Set<Listener>();

export function getState(): State {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit() {
  for (const fn of listeners) fn(state);
}

export function setTrack(track: Track) {
  state.track = track;
  state.selectedUid = null;
  emit();
}

export function clearTrack() {
  state.track = {
    version: 1,
    name: "untitled",
    room: { ...DEFAULT_ROOM },
    pieces: [],
  };
  state.selectedUid = null;
  emit();
}

export function addPiece(piece: Placed) {
  state.track.pieces.push(piece);
  emit();
}

export function updatePiece(uid: string, patch: Partial<Placed>) {
  const p = state.track.pieces.find((p) => p.uid === uid);
  if (!p) return;
  Object.assign(p, patch);
  emit();
}

export function applyUpdates(updates: Map<string, Partial<Placed>>) {
  for (const [uid, patch] of updates) {
    const p = state.track.pieces.find((pp) => pp.uid === uid);
    if (p) Object.assign(p, patch);
  }
  emit();
}

export function connectedComponent(uid: string): string[] {
  const visited = new Set<string>();
  const queue = [uid];
  while (queue.length) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const piece = state.track.pieces.find((p) => p.uid === cur);
    if (!piece) continue;
    for (const m of piece.mates) {
      if (m && !visited.has(m.uid)) queue.push(m.uid);
    }
  }
  return Array.from(visited);
}

export function removePiece(uid: string) {
  const idx = state.track.pieces.findIndex((p) => p.uid === uid);
  if (idx === -1) return;
  const piece = state.track.pieces[idx];
  for (const mate of piece.mates) {
    if (!mate) continue;
    const neighbour = state.track.pieces.find((p) => p.uid === mate.uid);
    if (neighbour) neighbour.mates[mate.connectorIdx] = null;
  }
  state.track.pieces.splice(idx, 1);
  if (state.selectedUid === uid) state.selectedUid = null;
  emit();
}

export function select(uid: string | null) {
  state.selectedUid = uid;
  emit();
}

export function detach(uid: string) {
  const piece = state.track.pieces.find((p) => p.uid === uid);
  if (!piece) return;
  let changed = false;
  for (let i = 0; i < piece.mates.length; i++) {
    const m = piece.mates[i];
    if (!m) continue;
    const n = state.track.pieces.find((p) => p.uid === m.uid);
    if (n) n.mates[m.connectorIdx] = null;
    piece.mates[i] = null;
    changed = true;
  }
  if (changed) emit();
}

export function setMate(uid: string, connectorIdx: 0 | 1, mate: Mate | null) {
  const piece = state.track.pieces.find((p) => p.uid === uid);
  if (!piece) return;
  const newMates: [Mate | null, Mate | null] = [piece.mates[0], piece.mates[1]];
  newMates[connectorIdx] = mate;
  piece.mates = newMates;
  emit();
}

export function newUid(): string {
  return Math.random().toString(36).slice(2, 10);
}