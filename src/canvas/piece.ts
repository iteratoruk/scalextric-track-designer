import type { Placed } from "../types";
import { getDef } from "../catalogue";

const NS = "http://www.w3.org/2000/svg";

export function renderPiece(piece: Placed, selected: boolean): SVGGElement {
  const def = getDef(piece.defId);
  const g = document.createElementNS(NS, "g");
  g.setAttribute("class", selected ? "piece selected" : "piece");
  g.setAttribute(
    "transform",
    `translate(${piece.pos.x} ${piece.pos.y}) rotate(${piece.rotation})`,
  );
  g.setAttribute("data-uid", piece.uid);
  for (const el of def.render()) g.appendChild(el);
  return g;
}