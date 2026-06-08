import { getState } from "../state/store";
import { renderRoom } from "../canvas/room";
import { renderPiece } from "../canvas/piece";

const NS = "http://www.w3.org/2000/svg";

const STYLE = `
.room { fill: #f5f3ea; stroke: #888; stroke-width: 2; }
.grid line { stroke: #e2dfd2; stroke-width: 1; }
.grid line.major { stroke: #cfcbb8; }
.piece .body { fill: #2c2c2c; stroke: #444; stroke-width: 1; }
.piece .border { stroke: #e8e2d0; fill: none; stroke-linecap: butt; }
.piece .slot { stroke: #0a0a0a; stroke-width: 3; fill: none; stroke-linecap: butt; }
.piece .rail { stroke: #b4b4b4; stroke-width: 1.2; fill: none; stroke-linecap: butt; }
.piece .shadow { fill: rgba(0, 0, 0, 0.35); }
.piece .kerb-apron { fill: #c8aa66; stroke: #6b5a2e; stroke-width: 1; }
.piece .kerb-rumble-red { fill: #cf3a2c; stroke: none; }
.piece .kerb-rumble-white { fill: #f2ede0; stroke: none; }
`;

export function exportPng(filename = "track.png") {
  const { track } = getState();
  const pxPerMm = 2;

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("xmlns", NS);
  svg.setAttribute("viewBox", `0 0 ${track.room.w} ${track.room.h}`);
  svg.setAttribute("width", String(track.room.w * pxPerMm));
  svg.setAttribute("height", String(track.room.h * pxPerMm));

  const style = document.createElementNS(NS, "style");
  style.textContent = STYLE;
  svg.appendChild(style);

  for (const el of renderRoom(track.room.w, track.room.h)) svg.appendChild(el);
  for (const piece of track.pieces) svg.appendChild(renderPiece(piece, false));

  const src = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([src], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = track.room.w * pxPerMm;
    canvas.height = track.room.h * pxPerMm;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    alert("Failed to render SVG for export.");
  };
  img.src = url;
}