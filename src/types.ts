export type Vec = { x: number; y: number };

export type Connector = { pos: Vec; angle: number };

export type PieceDef = {
  id: string;
  name: string;
  /** Connectors in the piece's local frame. Length is fixed per piece type (2 for
   *  straights and curves, 4 for crossovers, etc.). Borders carry none — they
   *  attach concentrically to a host piece rather than mating end-to-end. */
  connectors: Connector[];
  render(): SVGElement[];
  bbox: { x: number; y: number; w: number; h: number };
  rotateStep: number;
  /** Arc geometry for curved pieces (and the borders that wrap them), in the
   *  piece's local frame: centre of curvature at (0, centreRadius). Lets a
   *  border find each section-sized slot around a longer host arc. */
  arc?: { centreRadius: number; angleDeg: number };
  /** Straight-border marker: this border snaps along the edge of a straight run
   *  (rather than concentrically onto a curve). `length` is its run length. */
  straight?: { length: number };
  /** If present, this piece is a border accessory that snaps onto any placed
   *  piece whose defId is listed here — concentrically if it has `arc`, or along
   *  the edge if it has `straight`. */
  borderFor?: string[];
};

export type Mate = { uid: string; connectorIdx: number };

export type Placed = {
  uid: string;
  defId: string;
  pos: Vec;
  rotation: number;
  /** One entry per connector on the def; `null` means free, otherwise mated. */
  mates: (Mate | null)[];
  /** For border pieces: the uid of the host piece this border is clipped onto.
   *  The border shares the host's pos/rotation and rides along when it moves. */
  host?: string;
};

export type Track = {
  version: 1;
  name: string;
  room: { w: number; h: number };
  pieces: Placed[];
};