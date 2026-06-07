export type Vec = { x: number; y: number };

export type Connector = { pos: Vec; angle: number };

export type PieceDef = {
  id: string;
  name: string;
  /** Connectors in the piece's local frame. Length is fixed per piece type (2 for
   *  straights and curves, 4 for crossovers, etc.). */
  connectors: Connector[];
  render(): SVGElement[];
  bbox: { x: number; y: number; w: number; h: number };
  rotateStep: number;
};

export type Mate = { uid: string; connectorIdx: number };

export type Placed = {
  uid: string;
  defId: string;
  pos: Vec;
  rotation: number;
  /** One entry per connector on the def; `null` means free, otherwise mated. */
  mates: (Mate | null)[];
};

export type Track = {
  version: 1;
  name: string;
  room: { w: number; h: number };
  pieces: Placed[];
};