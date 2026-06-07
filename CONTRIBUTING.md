# Contributing

Thanks for your interest in the Scalextric Track Designer. Contributions of all
sizes are welcome — a typo fix, a new piece, a new mechanic, a docs improvement,
or anything you'd like to see in the app.

## The flow

The recommended path for any change is:

1. **An issue.** Open or pick up a [GitHub issue](https://github.com/iteratoruk/scalextric-track-designer/issues)
   that describes the change. For larger pieces of work, please open an issue
   first so we can agree on direction before you invest the time. Small fixes
   (typos, tightening copy, an obviously-correct one-liner) don't need an issue
   — go straight to a PR.
2. **A test.** Add a test that captures the behaviour you want — either by
   asserting the bug, or by describing the new feature. Tests live next to the
   code they cover (`src/foo/bar.test.ts` next to `src/foo/bar.ts`) and use
   [Vitest](https://vitest.dev). Pure functions are the easy case (see
   [`src/canvas/snap.test.ts`](src/canvas/snap.test.ts) for examples). For
   rendering and DOM work, tests are encouraged but not yet required while the
   testing layer for the canvas matures.
3. **Code to pass it.** Make the change. Keep the type-check and the test suite
   green:

   ```sh
   npm run build      # tsc --noEmit && vite build
   npm run test:run   # one-shot test run
   ```

4. **A pull request.** Open a PR against `main`. Reference the issue
   (`Closes #N` in the description so it auto-closes on merge). A short
   description of *why* the change is worth making is usually more useful than
   a long description of *what* it does — the diff already shows the what.

That's it. No CLA, no template gauntlet, no required reviewers — just an
issue, a test, the code, and a PR.

## Local setup

```sh
git clone git@github.com:iteratoruk/scalextric-track-designer.git
cd scalextric-track-designer
npm install
npm run dev       # http://localhost:5173
```

The app is a Vite-built TypeScript SPA with no framework. The
[README](README.md) has the controls and the catalogue table; the
[design notes](docs/design.md) cover the data model, snapping math, and
sequencing for the in-flight catalogue work.

## Style and conventions

Light-touch — match the surrounding code. A few things that come up:

- **Pieces are rigid ideals.** A `PieceDef` carries exact geometry — no
  tolerance fields. Tolerance is a property of joints, and lives in the
  snap layer.
- **Factories over duplication.** New curve radii or straight lengths are
  usually one call to `makeCurve()` or `makeStraight()`. Reach for a new
  factory only when the rendering genuinely diverges (see
  `makeCrossover()` and `makeRacingCurve()` for precedents).
- **No comments that re-state the code.** Comments explain *why* — a
  workaround, a manufacturer dimension, a non-obvious invariant.

## Where to discuss

[GitHub issues](https://github.com/iteratoruk/scalextric-track-designer/issues)
are the venue for everything — bug reports, feature requests, design
discussions, "is this in scope?" questions. Don't worry about whether your
thought is fully formed; an issue can be a question.