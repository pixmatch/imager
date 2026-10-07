# PixMatch 3.15.1 deployment notes

## Fixed Vercel build failure

Fixed the invalid regular-expression escape in `src/lib/pixmatch.ts` used by the local PDF exporter.

The PDF text escaping helper now uses:
- `\\` -> escaped backslash
- `(` -> `\\(`
- `)` -> `\\)`

This removes the Vite/Rollup `Invalid Unicode escape sequence` parser failure reported at `src/lib/pixmatch.ts:382`.

## Also corrected

The scientific CSV export header/value order now matches:
`ScientificFrame, Phase, Role, HeightPx, HeightPhysical, TopY, BottomY, PixelHeight, ContactDiameterPx, ContactDiameterPhysical, BaselineY, Components, Confidence, Status, OverlapPixels, AmbiguousPixels, ResolvedPixels`.

The Download button remains a multi-format menu for CSV, Excel-compatible XLS, graph PNG, PDF, HTML, and PIV CSV.

## Verification

- Source archive inspected.
- Invalid regex escape corrected.
- No additional malformed regex escapes were found in TS/TSX source during static scan.
- Global TypeScript parser check of `pixmatch.ts` reached module-resolution errors only; it reported no syntax error after the correction.
- Full Vite production build could not be run in this sandbox because project dependencies (`vite/client` and installed packages) are not present.
