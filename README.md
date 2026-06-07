# Scalextric Track Designer

A browser-based track designer for Scalextric Sport slot-car layouts. Drag
pieces from the palette onto a to-scale canvas, snap them together to form a
circuit, save your design to browser storage, and export it as a PNG.

The app is a static single-page application intended for deployment to GitHub
Pages.

## Status

Initial cut. The catalogue currently contains two pieces:

| Code  | Piece                 | Notes                                            |
| ----- | --------------------- | ------------------------------------------------ |
| C8205 | Standard Straight     | 350 × 155 mm                                     |
| C8206 | R2 Curve (45°)        | Outer R 370 mm, inner R 215 mm, width 155 mm     |

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