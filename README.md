# Scalextric Track Designer

[![Deploy](https://github.com/iteratoruk/scalextric-track-designer/actions/workflows/pages.yml/badge.svg)](https://github.com/iteratoruk/scalextric-track-designer/actions/workflows/pages.yml)

A browser-based track designer for Scalextric Sport slot-car layouts. Drag
pieces from the palette onto a to-scale canvas, snap them together to form a
circuit, save your design to browser storage, and export it as a PNG.

**Live demo:** <https://iteratoruk.github.io/scalextric-track-designer/>

The app is a static single-page application deployed to GitHub Pages.

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
| C8210 | Straight Crossover    | Two 409 mm straights at 90°, asymmetric `+`; crossing 136.5 mm from one end of each, 272.5 mm from the other; 4 connectors |
| C8295 | Elevated Crossover    | Two 262 mm straights at 90°, one elevated; 4 connectors |
| C8206 | R2 Curve (45°)        | Outer R 370 mm, inner R 215 mm, centre-line 292.5 mm |
| C8234 | R2 Half Curve (22.5°) | Same radii as C8206; 8 pieces make a 180° hairpin    |
| C8204 | R3 Curve (22.5°)      | Outer R 526 mm, inner R 371 mm, centre-line 448.5 mm |
| C8235 | R4 Curve (22.5°)      | Outer R 682 mm, inner R 527 mm, centre-line 604.5 mm |
| C8193 | Racing Curve          | R2 radius, 90° (= 2 × C8206); slots cross over so inside lane becomes outside |
| C8240 | R1 Outer Border (45°) | Kerb on the outside of an R1 curve; inner R 214 mm, 40 mm wide; clips concentrically to a C8202 (one section) or a C8201 hairpin (two sections); ships 4 per pack |
| C8228 | R2 Outer Border (45°) | Kerb on the outside of an R2 curve; inner R 370 mm, 40 mm wide; clips to a C8206, the C8193 racing curve (two sections), or two C8234 half-curves spanned as one; ships 4 per pack |
| C8239 | R2 Outer Border (22.5°) | The 22.5° half-section for R2 bends built from C8234 half-curves; same R2 outer edge (370 mm) and 40 mm width as C8228; subdivides longer hosts into more slots; ships 4 per pack |
| C8224 | R3 Outer Border (22.5°) | Kerb on the outside of the R3 curve (C8204); inner R 526 mm, 40 mm wide; joined C8204s merge into one host arc; ships 4 per pack |
| C8238 | R4 Outer Border (22.5°) | Kerb on the outside of the R4 curve (C8235); inner R 682 mm, 40 mm wide; joined C8235s merge into one host arc; ships 4 per pack |
| C8279 | R1 Inner Border (45°) | 40 mm sand band hugging the **inside** edge of an R1 bend (C8202 / C8278 / C8201); no rumble strip; the real 180° piece is scored at 22.5°, modelled here as the practical 45° section; ships 2 per pack |
| C8280 | R2 Inner Border (22.5°) | 40 mm sand band on the **inside** edge of an R2 bend (C8206 / C8234 / C8193); inner edge 215 mm, no rumble strip; same R2 host set as C8228/C8239; ships 4 per pack |
| C8225 | R2 Inner Border (45°) | The 45° R2 inner section; inner edge 215 mm, 40 mm band, no rumble strip; same R2 host set as C8280; ships 4 per pack |
| C8281 | R3 Inner Border (22.5°) | 40 mm sand band on the **inside** edge of the R3 curve (C8204); inner edge 371 mm, no rumble strip; ships 4 per pack |
| C8282 | R4 Inner Border (22.5°) | 40 mm sand band on the **inside** edge of the R4 curve (C8235); inner edge 527 mm, no rumble strip; ships 4 per pack |
| C8223 | Half-Straight Border | 175 mm rumble + apron border running alongside a **straight** edge; clips to either side of any straight run ≥ 175 mm, regardless of how the run is composed; ships 4 per pack |
| C8233 | Lead-In / Lead-Out Borders | Mirrored pair (two palette items), standard-straight length (350 mm), tapering from the full border down to just the rumble strip; same straight-edge snap as C8223; ships 2 per pack |

All curves are rendered through a shared `makeCurve()` factory in
[`src/catalogue/curve.ts`](src/catalogue/curve.ts), so additional radii and
half-angle variants land as a single call site each.

Border accessories use a sibling `makeBorder()` factory in
[`src/catalogue/border.ts`](src/catalogue/border.ts). A border carries no
connectors: instead of mating end-to-end it snaps *concentrically* onto the
outer edge of any curve listed in its `borderFor` set (C8240 → R1 curves,
C8228 → R2 curves), and then rides along when that curve is dragged or rotated.
Curves sharing a centre of curvature (joined smoothly) merge into one host arc,
so a border can span several pieces — e.g. two C8234 half-curves — and a host
arc longer than the border offers several section-sized slots, so two borders
wrap a 90° curve end to end. Double-click a border to peel it off.

Inner borders (C8279, via the `makeInnerBorder` factory) snap with the same
concentric logic but render on the *inside* of the bend — a sand band of the
same width as the outer borders, hugging the inner track edge, with no rumble
strip (no room on a tight inner radius) and 22.5° break-guide lines.

Straight borders (C8223, via the `makeStraightBorder` factory) are the linear
counterpart: they run *alongside* the edge of a straight. The same grouping idea
applies — collinear straights pointing the same way merge into one run — and the
border takes a length-sized slot anywhere along it, on either edge (a 180° flip
puts it on the far side). So a half-straight border clips to either side of a
350 mm straight, a 700 mm two-piece run, or any mix of equal total length.

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
npm run dev        # http://localhost:5173
npm run build      # type-check then produce dist/
npm run test       # vitest in watch mode
npm run test:run   # one-shot test run
npm run preview    # serve the production build locally
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — short version: open an issue, add a
test, make it pass, open a PR.

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