import type { PieceDef } from "../types";
import { straight } from "./straight";
import { c8202, c8206, c8234 } from "./curve";

export const catalogue: PieceDef[] = [straight, c8202, c8206, c8234];

const byId = new Map(catalogue.map((p) => [p.id, p]));

export function getDef(id: string): PieceDef {
  const d = byId.get(id);
  if (!d) throw new Error(`Unknown piece def: ${id}`);
  return d;
}