import type { Track } from "../types";

const KEY = "scalextric:tracks";

type Store = Record<string, Track>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function listTracks(): string[] {
  return Object.keys(readStore()).sort();
}

export function loadTrack(name: string): Track | null {
  return readStore()[name] ?? null;
}

export function saveTrack(track: Track) {
  const store = readStore();
  store[track.name] = track;
  writeStore(store);
}