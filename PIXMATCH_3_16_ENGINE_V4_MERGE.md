# PixMatch 3.16.0 — Scientific Engine v4 merge

## What was merged
`PixMatch_Scientific_Engine_v4` was added to the 3.15.1 app as a new, self-contained layer:

- `src/scientific/` — v4 engine (CIELAB/CIEDE2000 segmentation, morphology, connected components,
  calibration + uncertainty, confidence, batch executor, worker client, CSV/JSON export, self-check).
- `docs/scientific-engine-v4/` — v4 README, INTEGRATION checklist, FILE_MAP, TARGET_ARCHITECTURE.

## What was NOT changed
All 3.15.1 files are untouched. The UI (`src/routes/index.tsx`) and the legacy modules
(`src/lib/scientific.ts`, `segmentation.ts`, `color.ts`, `pixmatch.ts`) still run exactly as in 3.15.1.
No name collisions: v4 lives entirely under `src/scientific/` and has its own types.

## Status of integration
The engine is **present but not yet called by the UI**. Wiring it in is the job listed in
`docs/scientific-engine-v4/INTEGRATION.md` (convert the reference-frame recipe into `MeasurementDefinition[]`,
route frames through `runInWorker()`, standardise on mmPerPixel, then retire the duplicate legacy path).
It handles HEIGHT only so far (other `quantity` values return no physical value).

## Verification
- `tsc --noEmit` passes on `src/scientific/` with the v4 tsconfig and with the app's stricter flags.
- Node smoke test on synthetic frames: a 30 px tall red block at 0.1 mm/px gives 3 mm (VALID);
  a blank frame gives MISSING_PHASE.
- Full `vite build` was not run (no node_modules in this environment).
