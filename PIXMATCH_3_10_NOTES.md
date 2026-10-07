# PixMatch 3.10

## Reference-driven measurement

The reference frame is treated as a measurement definition, not as a set of pixels to drag through the sequence.
A user-defined phase stores its CIELAB appearance, RGB appearance, histogram limits, seed and detection settings. Each subsequent frame independently re-identifies the current phase and recomputes the quantity from its current geometry.

For a `height` line associated with a target phase, the line now defines the **measurement axis**. The reported height is the full extent of the current target mask projected onto that axis. This prevents a tilted/deformed object from being measured by stale endpoint geometry.

Base and chord roles remain available for explicit baseline/span measurements.

## CIELAB + RGB detection

Detection supports:
- CIEDE2000/CIE76 colour distance
- adjustable L* weighting
- adjustable RGB contribution
- RGB tolerance
- histogram limits for L*, a*, b*, R, G and B
- reference-region percentile fitting

RGB and CIELAB are complementary evidence; the user can turn RGB contribution down to zero when the experiment is better described by CIELAB alone.

## Bulk PIV-style image velocimetry

The new PIV panel supports:
- arbitrary bulk image sequences
- consecutive pairs or configurable frame stride
- acquisition FPS → velocity conversion
- interrogation window and grid spacing
- search radius
- correlation threshold and SNR threshold
- optional two-pass refinement
- median residual vector validation
- current-frame vector overlay
- CSV export of every vector and physical velocity
- automatic use of the calibrated scale on each pair

This is an image cross-correlation/PIV-style tracker for experimental sequences. It is intentionally transparent and parameterized rather than pretending to be a full commercial PIV package. For publication-grade PIV, validate window overlap, seeding density, correlation peak quality, calibration, and uncertainty against your experimental setup.

## Bulk workflow

1. Open all images in one sequence. The file order is the pair order.
2. Set the acquisition FPS.
3. Set the frame stride (1 = adjacent frames).
4. Set interrogation window, grid step and search radius.
5. Optionally draw a rectangular selection to visually constrain the analysis; the current PIV implementation is ready for ROI wiring in a subsequent release.
6. Run **PIV on bulk**.
7. Review the vector overlay and correlation/valid-vector summary.
8. Export PIV vectors as CSV.

All scientific phase measurements and PIV can coexist in the same workspace.
