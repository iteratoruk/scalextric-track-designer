import type { PieceDef } from "../types";
import { straight } from "./straight";
import { curve } from "./curve";

export const catalogue: PieceDef[] = [straight, curve];

const byId = new Map(catalogue.map((p) => [p.id, p]));

export function getDef(id: string): PieceDef {
  const d = byId.get(id);
  if (!d) throw new Error(`Unknown piece def: ${id}`);
  return d;
}