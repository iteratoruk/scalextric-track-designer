import { mountCanvas } from "./canvas/canvas";
import { mountPalette } from "./palette/palette";
import { mountToolbar } from "./ui/toolbar";
import { getState, subscribe } from "./state/store";

const canvasHost = document.getElementById("canvas-host")!;
const palette = document.getElementById("palette")!;
const toolbar = document.getElementById("toolbar")!;
const statusbar = document.getElementById("statusbar")!;

mountCanvas(canvasHost);
mountPalette(palette);
mountToolbar(toolbar);

const hint = document.createElement("span");
hint.textContent =
  "Drag pieces from palette · Click select · Drag chain to move · ↺/↻ or R / Shift+R to rotate · Delete · Double-click detach · Space-drag pan · Wheel zoom";

const stats = document.createElement("span");
stats.style.marginLeft = "auto";

statusbar.replaceChildren(hint, stats);

function refreshStats() {
  const { track } = getState();
  let free = 0;
  for (const p of track.pieces) {
    for (const m of p.mates) if (!m) free++;
  }
  stats.textContent = `${track.pieces.length} pieces · ${free} free ends`;
}
refreshStats();
subscribe(refreshStats);