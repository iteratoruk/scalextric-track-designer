import { catalogue } from "../catalogue";
import type { PieceDef } from "../types";

const NS = "http://www.w3.org/2000/svg";

const THUMB_SIZE = 140;

export function mountPalette(el: HTMLElement) {
  el.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = "Pieces";
  el.appendChild(heading);
  for (const def of catalogue) el.appendChild(makeItem(def));
}

function makeItem(def: PieceDef): HTMLElement {
  const item = document.createElement("div");
  item.className = "palette-item";
  item.draggable = true;
  item.appendChild(makeThumb(def));

  const label = document.createElement("div");
  label.className = "label";
  label.textContent = def.name;
  item.appendChild(label);

  item.addEventListener("dragstart", (ev) => {
    if (!ev.dataTransfer) return;
    ev.dataTransfer.setData("application/x-piece", def.id);
    ev.dataTransfer.effectAllowed = "copy";
  });

  return item;
}

function makeThumb(def: PieceDef): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", String(THUMB_SIZE));
  svg.setAttribute("height", String(THUMB_SIZE));
  const pad = 20;
  svg.setAttribute(
    "viewBox",
    `${def.bbox.x - pad} ${def.bbox.y - pad} ${def.bbox.w + 2 * pad} ${def.bbox.h + 2 * pad}`,
  );
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const g = document.createElementNS(NS, "g");
  g.setAttribute("class", "piece");
  for (const el of def.render()) g.appendChild(el);
  svg.appendChild(g);
  return svg;
}