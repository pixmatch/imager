# PixMatch Scientific Engine Refactor — 3.14

## Assessment

### Required and implemented
- **Per-frame independence:** required. Reference-frame colour/geometry remains authoritative; a previous frame can supply only a soft seed prior. It cannot impose a previous mask on the current frame.
- **Physical measurement over appearance:** required. Scientific measurements are recomputed from the current frame's segmented mask and user-defined measurement geometry.
- **Explicit calibration:** required. Physical quantities are computed only through the active `pxPerUnit` scale; no expected physical value is inferred.
- **Safe batch execution:** required. Batch processing now validates image buffers, catches per-frame failures, yields between frames, and records structured statuses.
- **sRGB → XYZ → CIELAB:** required and implemented with IEC sRGB decoding and D65 matrices.
- **CIEDE2000:** required and implemented with zero-chroma handling plus finite-result protection.
- **Dynamic vertical bounds:** required and implemented as per-frame `minY`, `maxY`, and `pixelHeight`, while semantic height/base/chord definitions remain available.

### Important additions beyond the supplied specification
- **Post-morphology statistics:** area, centroid and mean CIELAB are recomputed from the final mask, so smoothing/fill operations cannot leave stale statistics.
- **Interaction quality propagation:** overlapping/ambiguous phase pixels now affect confidence/status. Large ambiguity can produce `SEGMENTATION_FAILED`; moderate ambiguity produces `LOW_CONFIDENCE` instead of being silently presented as valid.
- **Scientific exports:** CSV/HTML include pixel-height and interaction diagnostics.
- **Reference-anchored soft tracking:** conventional recipe regions and scientific CIELAB components both use the reference location/colour as the primary evidence; temporal tracking is secondary.

## Deliberately not hard-coded
The engine does not assume oil, water, drops, needles, contact angles, or any other particular experiment. Phase names and physical roles remain user-defined.

## Research limitation
No colour-space segmentation can resolve a genuinely unobservable surface when two phases become indistinguishable in the image. The engine therefore exposes ambiguity rather than fabricating certainty.

## Verification performed
- TypeScript no-emit compilation of `color.ts`, `segmentation.ts`, `scientific.ts`, and `pixmatch.ts` passes.
- CIEDE2000 checked against standard reference pairs; error was below 5e-5 ΔE for the tested cases.
- Synthetic segmentation test verified correct mask bounds and physical-height conversion.
- Batch executor smoke test verified per-frame result collection and yielding.
- Full application production build was not run because the extracted workspace has no installed `node_modules` in this environment.
