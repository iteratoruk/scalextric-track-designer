# Scalextric Track Designer — Design Notes

A browser-based track designer for Scalextric slot-car layouts. Static SPA,
deployable to GitHub Pages.

## Goals (v1)

- A scaled canvas representing a room, on which a circuit is built.
- A palette of track pieces, drag-and-drop onto the canvas.
- Snapping: pieces clip together end-to-end automatically.
- Select / rotate / delete pieces.
- New / Save / Load (browser storage) / Export (PNG; PDF later).

Out of scope for v1: digital track features (lane changers, pit lanes, power),
elevation, undo/redo history, multi-circuit overlays, freeform room polygons
(v1 ships with a rectangular room; rectilinear polygon editor is v2).

## Stack

- **Vanilla TypeScript + Vite.** No framework.
- **SVG** for canvas rendering. Crisp at any zoom, easy to serialize for export,
  hit-testing comes for free, and snap math stays simple.
- **localStorage** for persistence; **canvas → toBlob** for PNG export.
- **jsPDF** (added later) for PDF export.

## Units & coordinate system

- World units: **millimetres**. Real piece dimensions live in the catalogue
  unchanged from manufacturer specs.
- SVG `viewBox` is in mm. CSS sizes the SVG; the viewBox handles zoom.
- Origin (0, 0) is the top-left of the room.
- Angles in degrees, clockwise (matching SVG `transform="rotate(deg)"`).

## Data model

```ts
type Vec = { x: number; y: number };

// A connector is one end of a track piece. Direction is the OUTWARD-facing
// angle of the connector — i.e. the way the next piece would extend.
type Connector = { pos: Vec; angle: number };

// Catalogue piece (intrinsic geometry, no world placement).
type PieceDef = {
  id: string;                 // e.g. "straight-standard"
  name: string;
  // Connectors in the piece's local frame (origin at piece's anchor).
  connectors: [Connector, Connector];
  // SVG fragment (returns <g> children) drawn in the piece's local frame.
  render(): SVGElement[];
  // Bounding box in local frame, for thumbnails and hit assist.
  bbox: { w: number; h: number };
};

// Placed piece on the canvas.
type Placed = {
  uid: string;                // instance id
  defId: string;              // -> PieceDef
  pos: Vec;                   // world position of the local origin
  rotation: number;           // degrees, clockwise
  // Which of this piece's connectors are mated to which neighbour.
  // Index = connector index on this piece; value = { uid, connectorIdx } or null.
  mates: [Mate | null, Mate | null];
};

type Mate = { uid: string; connectorIdx: 0 | 1 };

type Track = {
  version: 1;
  name: string;
  room: { w: number; h: number };   // mm
  pieces: Placed[];
};
```

## Catalogue (v1)

Two pieces to validate the design loop end-to-end. Dimensions are approximate
Sport-track values; refine when the user supplies authoritative data.

- **Standard straight** — 350 mm × 152 mm. Connectors at the two short ends,
  facing outward along the long axis.
- **Standard curve (R2)** — 22.5° arc, 350 mm radius to slot centre, 152 mm
  track width. Eight pieces complete a 180° turn.

A piece's local frame puts connector 0 at the origin, pointing in the −x
direction (so a straight extends along +x, and a curve sweeps clockwise from
+x toward +y by default).

## Snapping

When a piece is placed or moved:

1. Compute world-space position+angle of each of its free connectors.
2. For every other piece, compute world-space position+angle of free connectors.
3. If any pair is within `SNAP_DISTANCE` (e.g. 12 mm), snap:
   - Translate the moving piece so its connector position equals the target's.
   - Rotate so the moving connector faces *opposite* the target connector
     (mating direction = target.angle + 180°).
   - Record a `Mate` on both sides.
4. If both ends of the moving piece can snap, prefer the closer one; the other
   only snaps if its geometry already lines up (don't tear the piece).

### Borders (accessories)

Borders (kerbs) don't mate end-to-end — they clip onto the *outside* of a
curve. A border `PieceDef` carries **no connectors** and a `borderFor` list of
the curve def-ids it fits; it's built in the host curve's own local frame, so
overlaying the two origins lays the kerb exactly on the outer edge. `Placed`
gains an optional `host` (the curve's uid). On drop/move, `findBorderSnap`
overlays a nearby border onto a matching host. Hosts expose their `arc`
(centre-of-curvature radius + sweep). `findBorderSnap` groups candidate hosts by
shared centre of curvature, so curves joined into a smooth bend (e.g. two R2
half-curves) merge into one continuous host arc. Each contiguous run offers
section-sized slots stepped from every section boundary (so a long single piece
and a run of short ones both expose every valid placement); the border snaps to
whichever it was dropped nearest, attaching to the section that holds the slot's
start. `connectedComponent` then pulls hosted borders along when the host is
dragged or rotated (one-directional — grabbing the border alone just repositions
it). C8240 (R1, 45°) and C8228 (R2, 45°) are the first such pieces: one section
borders a 45° curve, two wrap a 90° curve, and one spans two joined half-curves.
Inner borders (C8279) reuse all of this but render on the inside edge.

**Straight borders** (C8223) are the linear analogue: `findBorderSnap` dispatches
on the border kind (`arc` → concentric curve snap; `straight` → edge snap). The
edge snap groups collinear straights pointing the same way into one run (distance
along the line replaces angle around the centre of curvature), then offers
length-sized slots along it on either track edge — the far edge via a 180° flip.
Hosts (straights) expose their length through `bbox.w`, so no extra metadata is
needed; the `host` ride-along is shared with the curve borders.

## Interaction

- **Drag from palette** → drop on canvas creates a new piece at cursor; runs
  snapping immediately.
- **Click** a piece → select (highlight via stroke).
- **Double-click** a piece → detach: clears its `mates` and marks it free to
  drag without re-snapping until released.
- **Drag** a piece → moves it; snapping runs on drop.
- **Delete / Backspace** → remove selected piece; clear neighbours' mates.
- **R** → rotate selected piece by the piece's natural angle increment
  (straight: 90°; curve: 22.5°).
- **Wheel** → zoom; **space-drag** → pan.

## Persistence

- `localStorage` key: `scalextric:tracks` → `Record<string, Track>` (name → track).
- Save prompts for a name; load shows a picker of saved names.
- "New" clears the canvas after confirming if dirty.

## Export

- **PNG**: serialize the SVG, draw to an offscreen `<canvas>`, `toBlob` →
  download.
- **PDF**: deferred (jsPDF + svg2pdf, or canvas-to-image embed).

## Project layout

```
index.html
package.json
tsconfig.json
vite.config.ts
docs/design.md
src/
  main.ts
  style.css
  types.ts
  catalogue/
    index.ts          # registry
    straight.ts
    curve.ts
  state/
    store.ts          # in-memory state + subscribe()
    persistence.ts    # localStorage save/load
  canvas/
    canvas.ts         # SVG controller, pan/zoom, hit testing
    room.ts           # room boundary
    piece.ts          # render placed piece, selection highlight
    snap.ts           # snapping math
  palette/
    palette.ts        # sidebar + drag source
  ui/
    toolbar.ts        # New / Save / Load / Export
    export.ts         # PNG export
```

## GitHub Pages

`vite.config.ts` uses `base: './'` so relative asset URLs work under
`/scalextric-track-designer/`. A GitHub Action (later) builds `dist/` and
publishes to the `gh-pages` branch.