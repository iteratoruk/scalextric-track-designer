# Scalextric Track Designer

A browser-based track designer for Scalextric Sport slot-car layouts. Drag
pieces from the palette onto a to-scale canvas, snap them together to form a
circuit, save your design to browser storage, and export it as a PNG.

The app is a static single-page application intended for deployment to GitHub
Pages.

## Status

Catalogue progress (see issue [#1](https://github.com/iteratoruk/scalextric-track-designer/issues/1)
for the full plan):

| Code  | Piece                 | Notes                                            |
| ----- | --------------------- | ------------------------------------------------ |
| C8505 | Extra Long Straight   | 584 × 155 mm (= 1 × C8205 + 3 × C8236)               |
| C8205 | Standard Straight     | 350 × 155 mm                                         |
| C8222 | Half Straight         | 175 × 155 mm                                         |
| C8200 | Quarter Straight      | 87 × 155 mm                                          |
| C8236 | Short Straight        | 78 × 155 mm                                          |
| C8246 | Sideswipe (narrowing) | 350 × 155 mm; slots taper standard → narrow          |
| C8246 | Sideswipe (expanding) | 350 × 155 mm; slots taper narrow → standard          |
| C8202 | R1 Curve (45°)        | Outer R 214 mm, inner R 59 mm, centre-line 136.5 mm  |
| C8278 | R1 Half Curve (22.5°) | Same radii as C8202; 8 pieces make a 180° hairpin    |
| C8201 | R1 Hairpin (90°)      | R1 radius, narrow slot spacing; 2 pieces = 180°; enter/exit via C8246 sideswipes |
| C8210 | Straight Crossover    | Two 409 mm straights at 90°, flat; slots break at the crossing; 4 connectors |
| C8295 | Elevated Crossover    | Two 262 mm straights at 90°, one elevated; 4 connectors |
| C8206 | R2 Curve (45°)        | Outer R 370 mm, inner R 215 mm, centre-line 292.5 mm |
| C8234 | R2 Half Curve (22.5°) | Same radii as C8206; 8 pieces make a 180° hairpin    |
| C8204 | R3 Curve (22.5°)      | Outer R 526 mm, inner R 371 mm, centre-line 448.5 mm |
| C8235 | R4 Curve (22.5°)      | Outer R 682 mm, inner R 527 mm, centre-line 604.5 mm |

All curves are rendered through a shared `makeCurve()` factory in
[`src/catalogue/curve.ts`](src/catalogue/curve.ts), so additional radii and
half-angle variants land as a single call site each.

## Features (so far)

- Scaled SVG canvas (units in millimetres) with pan and zoom
- Rectangular room boundary with a 100 mm minor / 500 mm major grid
- Drag and drop pieces from the palette onto the canvas
- Automatic end-to-end snapping between free connectors
- Connected pieces drag as a rigid chain; the chain re-snaps on drop
- Click to select; visible ↺ / ↻ rotation handles on the selected piece
  (R / Shift+R also rotate)
- Double-click to detach a piece from its neighbours
- Delete / Backspace to remove the selected piece
- Open-ring indicators on every unmated connector to help spot phantom gaps
- New / Save / Load to browser `localStorage` (keyed by track name)
- Export the current layout as PNG (white background, 2 px / mm)

Not yet implemented: PDF export, rectilinear room polygon editor, additional
pieces, undo / redo, GitHub Pages deploy workflow.

## Stack

- TypeScript, no UI framework
- [Vite](https://vitejs.dev) for the dev server and production build
- Native SVG for canvas rendering and PNG export

## Develop

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check then produce dist/
npm run preview   # serve the production build locally
```

## Controls

| Action                 | Input                                  |
| ---------------------- | -------------------------------------- |
| Add a piece            | Drag from the palette onto the canvas  |
| Select                 | Click a piece                          |
| Move                   | Drag a piece (whole chain moves)       |
| Rotate                 | ↺ / ↻ handles, or `R` / `Shift+R`      |
| Detach from neighbours | Double-click                           |
| Delete                 | `Delete` or `Backspace`                |
| Pan                    | Hold `Space` and drag                  |
| Zoom                   | Mouse wheel                            |

## Project layout

```
docs/
  design.md                       # design notes
  scalextric-track-sections.pdf   # manufacturer dimensions reference
src/
  catalogue/                      # piece definitions (straight, curve)
  canvas/                         # SVG canvas controller and snap math
  palette/                        # piece palette / drag source
  state/                          # in-memory store and persistence
  ui/                             # toolbar and PNG export
  main.ts                         # entry point
```

See [`docs/design.md`](docs/design.md) for the data model and snapping rules.