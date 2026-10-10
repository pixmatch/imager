# PixMatch 3.17 — user-defined measurable quantities

## What changed
Frame 1 is still the only place measurements are defined, but you can now define **any number of named
quantities**, not just height:

| Pick in "Define a measurable quantity" | Draw with | Tracked in every frame as |
| --- | --- | --- |
| Height — line | Line tool | both ends re-located (CIELAB + RGB), new length reported |
| Diameter / width — line | Line tool | same |
| Other length — line (name it) | Line tool | same |
| Contact angle — angle | Angle tool (arm-1 end, vertex, arm-2 end) | phase inside the wedge is segmented; boundary tangent at the contact point |
| Other angle — 3 points (name it) | Angle tool | all three points re-located; angle recomputed |
| Phase extent / Base level / Chord span | Line tool | unchanged from 3.16 (need a phase) |

You can type your own name for any quantity ("Neck width", "Left contact angle" ...). Results appear as one
column per quantity (deg for angles), in the chart, the table, CSV, HTML and Excel ("Tracked quantities" sheet).

## Contact-angle convention
Vertex = contact point. Arm 1 runs along the solid surface toward the drop. Arm 2 only needs to point roughly
along the interface. The reported angle is the interior angle between arm 1 and the interface tangent at the vertex.
A straight-line fit over a curved interface reads low, so the fit is repeated at half the radius and extrapolated to
zero radius. If the wedge region cannot be segmented in a frame, the angle falls back to the 3-point value and the
method column says `3-point`.

## First + last frame keyframes
After saving a quantity, go to the **last** frame, draw the same line/angle there (same point order), select it and press
"Set from selected line/angle (last frame)" on that quantity. Interim frames are then searched around the
position interpolated between the first and last placements, and each point is matched against both the
first-frame and last-frame appearance (the better match wins). Without a last-frame placement the old behaviour
(search around the previous frame's result) is used.

## Not included yet
Free-form polyline tracing of the phase-regime boundary on first/last frames.
