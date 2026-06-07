export type Vec = { x: number; y: number };

export type Connector = { pos: Vec; angle: number };

export type PieceDef = {
  id: string;
  name: string;
  connectors: [Connector, Connector];
  render(): SVGElement[];
  bbox: { x: number; y: number; w: number; h: number };
  rotateStep: number;
};

export type Mate = { uid: string; connectorIdx: 0 | 1 };

export type Placed = {
  uid: string;
  defId: string;
  pos: Vec;
  rotation: number;
  mates: [Mate | null, Mate | null];
};

export type Track = {
  version: 1;
  name: string;
  room: { w: number; h: number };
  pieces: Placed[];
};