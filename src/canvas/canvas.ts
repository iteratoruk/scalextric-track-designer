import {
  getState,
  subscribe,
  addPiece,
  removePiece,
  select,
  detach,
  updatePiece,
  applyUpdates,
  setMate,
  connectedComponent,
  newUid,
} from "../state/store";
import { renderRoom } from "./room";
import { renderPiece } from "./piece";
import { findChainSnap, rotate, worldConnector, type ChainSnap } from "./snap";
import { getDef } from "../catalogue";
import type { Placed, Vec } from "../types";

const NS = "http://www.w3.org/2000/svg";

let host: HTMLElement;
let svg: SVGSVGElement;
let roomLayer: SVGGElement;
let pieceLayer: SVGGElement;
let overlayLayer: SVGGElement;
const view = { x: -300, y: -300, w: 4600, h: 3600 };

type DragState = {
  uids: string[];
  startPointer: Vec;
  startPositions: Map<string, Vec>;
  moved: boolean;
};

let dragState: DragState | null = null;
let panState: { startScreen: Vec; startView: { x: number; y: number } } | null = null;
let spaceDown = false;

export function mountCanvas(el: HTMLElement) {
  host = el;
  svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "canvas");
  svg.setAttribute("viewBox", viewBoxString());
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  host.appendChild(svg);

  roomLayer = document.createElementNS(NS, "g");
  pieceLayer = document.createElementNS(NS, "g");
  overlayLayer = document.createElementNS(NS, "g");
  svg.appendChild(roomLayer);
  svg.appendChild(pieceLayer);
  svg.appendChild(overlayLayer);

  attachEvents();
  render();
  subscribe(render);
}

export function getSvg(): SVGSVGElement {
  return svg;
}

function viewBoxString() {
  return `${view.x} ${view.y} ${view.w} ${view.h}`;
}

function setViewBox() {
  svg.setAttribute("viewBox", viewBoxString());
}

function render() {
  const { track, selectedUid } = getState();
  roomLayer.replaceChildren(...renderRoom(track.room.w, track.room.h));

  pieceLayer.replaceChildren();
  for (const piece of track.pieces) {
    pieceLayer.appendChild(renderPiece(piece, piece.uid === selectedUid));
  }

  overlayLayer.replaceChildren();
  for (const piece of track.pieces) {
    for (const idx of [0, 1] as const) {
      if (piece.mates[idx]) continue;
      const c = worldConnector(piece, idx);
      overlayLayer.appendChild(makeFreeDot(c.pos.x, c.pos.y));
    }
  }
  if (selectedUid) {
    const selected = track.pieces.find((p) => p.uid === selectedUid);
    if (selected) {
      for (const h of renderRotationHandles(selected)) overlayLayer.appendChild(h);
    }
  }
}

function makeFreeDot(cx: number, cy: number): SVGCircleElement {
  const c = document.createElementNS(NS, "circle");
  c.setAttribute("cx", String(cx));
  c.setAttribute("cy", String(cy));
  c.setAttribute("r", "7");
  c.setAttribute("class", "free-connector");
  return c;
}

function pointerToWorld(ev: { clientX: number; clientY: number }): Vec {
  const rect = svg.getBoundingClientRect();
  const px = (ev.clientX - rect.left) / rect.width;
  const py = (ev.clientY - rect.top) / rect.height;
  const vbAspect = view.w / view.h;
  const elAspect = rect.width / rect.height;
  let u: number, v: number;
  if (elAspect > vbAspect) {
    const scale = rect.height / view.h;
    const renderedW = view.w * scale;
    const offset = (rect.width - renderedW) / 2;
    u = (ev.clientX - rect.left - offset) / renderedW;
    v = py;
  } else {
    const scale = rect.width / view.w;
    const renderedH = view.h * scale;
    const offset = (rect.height - renderedH) / 2;
    u = px;
    v = (ev.clientY - rect.top - offset) / renderedH;
  }
  return { x: view.x + u * view.w, y: view.y + v * view.h };
}

function attachEvents() {
  svg.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    if (spaceDown) {
      panState = {
        startScreen: { x: ev.clientX, y: ev.clientY },
        startView: { x: view.x, y: view.y },
      };
      svg.classList.add("panning");
      svg.setPointerCapture(ev.pointerId);
      return;
    }
    const target = (ev.target as Element).closest(".piece") as SVGGElement | null;
    if (target) {
      const uid = target.getAttribute("data-uid")!;
      select(uid);
      const componentUids = connectedComponent(uid);
      const startPositions = new Map<string, Vec>();
      for (const cid of componentUids) {
        const p = getState().track.pieces.find((pp) => pp.uid === cid)!;
        startPositions.set(cid, { ...p.pos });
      }
      dragState = {
        uids: componentUids,
        startPointer: pointerToWorld(ev),
        startPositions,
        moved: false,
      };
      svg.setPointerCapture(ev.pointerId);
    } else {
      select(null);
    }
  });

  svg.addEventListener("pointermove", (ev) => {
    if (panState) {
      const rect = svg.getBoundingClientRect();
      const dx = ((ev.clientX - panState.startScreen.x) * view.w) / rect.width;
      const dy = ((ev.clientY - panState.startScreen.y) * view.h) / rect.height;
      view.x = panState.startView.x - dx;
      view.y = panState.startView.y - dy;
      setViewBox();
      return;
    }
    if (!dragState) return;
    const world = pointerToWorld(ev);
    const dx = world.x - dragState.startPointer.x;
    const dy = world.y - dragState.startPointer.y;
    if (Math.hypot(dx, dy) > 1) dragState.moved = true;
    const updates = new Map<string, Partial<Placed>>();
    for (const uid of dragState.uids) {
      const start = dragState.startPositions.get(uid)!;
      updates.set(uid, { pos: { x: start.x + dx, y: start.y + dy } });
    }
    applyUpdates(updates);
  });

  svg.addEventListener("pointerup", (ev) => {
    if (panState) {
      panState = null;
      svg.classList.remove("panning");
      svg.releasePointerCapture(ev.pointerId);
      return;
    }
    if (dragState && dragState.moved) tryChainSnap(dragState.uids);
    dragState = null;
    svg.releasePointerCapture(ev.pointerId);
  });

  svg.addEventListener("dblclick", (ev) => {
    const target = (ev.target as Element).closest(".piece") as SVGGElement | null;
    if (target) {
      const uid = target.getAttribute("data-uid")!;
      detach(uid);
    }
  });

  svg.addEventListener(
    "wheel",
    (ev) => {
      ev.preventDefault();
      const factor = ev.deltaY > 0 ? 1.1 : 1 / 1.1;
      const world = pointerToWorld(ev);
      view.x = world.x - (world.x - view.x) * factor;
      view.y = world.y - (world.y - view.y) * factor;
      view.w *= factor;
      view.h *= factor;
      setViewBox();
    },
    { passive: false },
  );

  host.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
  });
  host.addEventListener("drop", (ev) => {
    ev.preventDefault();
    const defId = ev.dataTransfer?.getData("application/x-piece");
    if (!defId) return;
    const world = pointerToWorld(ev);
    const piece: Placed = {
      uid: newUid(),
      defId,
      pos: world,
      rotation: 0,
      mates: [null, null],
    };
    addPiece(piece);
    tryChainSnap([piece.uid]);
    select(piece.uid);
  });

  window.addEventListener("keydown", (ev) => {
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (ev.code === "Space") {
      spaceDown = true;
      svg.style.cursor = "grab";
      ev.preventDefault();
      return;
    }

    const { selectedUid } = getState();
    if (!selectedUid) return;

    if (ev.key === "Delete" || ev.key === "Backspace") {
      ev.preventDefault();
      removePiece(selectedUid);
    } else if (ev.key === "r" || ev.key === "R") {
      ev.preventDefault();
      rotateSelected(ev.shiftKey ? -1 : +1);
    }
  });
  window.addEventListener("keyup", (ev) => {
    if (ev.code === "Space") {
      spaceDown = false;
      svg.style.cursor = "";
    }
  });
}

function tryChainSnap(componentUids: string[]) {
  const { track } = getState();
  const set = new Set(componentUids);
  const inside = track.pieces.filter((p) => set.has(p.uid));
  const outside = track.pieces.filter((p) => !set.has(p.uid));
  const snap = findChainSnap(inside, outside);
  if (snap) applyChainSnap(snap, componentUids);
}

function applyChainSnap(snap: ChainSnap, componentUids: string[]) {
  const updates = new Map<string, Partial<Placed>>();
  for (const uid of componentUids) {
    const piece = getState().track.pieces.find((p) => p.uid === uid);
    if (!piece) continue;
    const rel = { x: piece.pos.x - snap.pivot.x, y: piece.pos.y - snap.pivot.y };
    const r = rotate(rel, snap.deltaAngle);
    updates.set(uid, {
      pos: {
        x: r.x + snap.pivot.x + snap.translation.x,
        y: r.y + snap.pivot.y + snap.translation.y,
      },
      rotation: (piece.rotation + snap.deltaAngle + 720) % 360,
    });
  }
  applyUpdates(updates);
  setMate(snap.movingUid, snap.movingIdx, {
    uid: snap.targetUid,
    connectorIdx: snap.targetIdx,
  });
  setMate(snap.targetUid, snap.targetIdx, {
    uid: snap.movingUid,
    connectorIdx: snap.movingIdx,
  });
}

function rotateSelected(direction: 1 | -1) {
  const { selectedUid } = getState();
  if (!selectedUid) return;
  const piece = getState().track.pieces.find((p) => p.uid === selectedUid);
  if (!piece) return;
  const def = getDef(piece.defId);
  detach(selectedUid);
  updatePiece(selectedUid, {
    rotation: (piece.rotation + def.rotateStep * direction + 720) % 360,
  });
  tryChainSnap([selectedUid]);
}

function worldBbox(piece: Placed) {
  const def = getDef(piece.defId);
  const { x, y, w, h } = def.bbox;
  const corners = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ].map((c) => {
    const r = rotate(c, piece.rotation);
    return { x: piece.pos.x + r.x, y: piece.pos.y + r.y };
  });
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

function renderRotationHandles(piece: Placed): SVGGElement[] {
  const bb = worldBbox(piece);
  const cx = bb.x + bb.w / 2;
  const top = bb.y - 60;
  return [
    makeHandle(cx - 70, top, "↺", () => rotateSelected(-1)),
    makeHandle(cx + 70, top, "↻", () => rotateSelected(+1)),
  ];
}

function makeHandle(cx: number, cy: number, icon: string, onClick: () => void): SVGGElement {
  const g = document.createElementNS(NS, "g");
  g.setAttribute("class", "rotation-handle");

  const circle = document.createElementNS(NS, "circle");
  circle.setAttribute("cx", String(cx));
  circle.setAttribute("cy", String(cy));
  circle.setAttribute("r", "40");
  g.appendChild(circle);

  const text = document.createElementNS(NS, "text");
  text.setAttribute("x", String(cx));
  text.setAttribute("y", String(cy));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.setAttribute("font-size", "56");
  text.textContent = icon;
  g.appendChild(text);

  g.addEventListener("pointerdown", (ev) => {
    ev.stopPropagation();
  });
  g.addEventListener("click", (ev) => {
    ev.stopPropagation();
    onClick();
  });

  return g;
}