import type { PieceDef } from "../types";
import { c8200, c8205, c8222, c8236, c8246Expand, c8246Narrow, c8505 } from "./straight";
import { c8201, c8202, c8204, c8206, c8234, c8235, c8278 } from "./curve";
import { c8210, c8295 } from "./crossover";

export const catalogue: PieceDef[] = [
  c8505, c8205, c8222, c8200, c8236,
  c8246Narrow, c8246Expand,
  c8202, c8278, c8201,
  c8206, c8234, c8204, c8235,
  c8210, c8295,
];

const byId = new Map(catalogue.map((p) => [p.id, p]));

export function getDef(id: string): PieceDef {
  const d = byId.get(id);
  if (!d) throw new Error(`Unknown piece def: ${id}`);
  return d;
}