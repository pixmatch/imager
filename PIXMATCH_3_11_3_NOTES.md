# PixMatch 3.11.3

## Reference CIELAB trace visibility

- Captured CIELAB regions are persisted as full normalized reference contours.
- Adding a component no longer makes the reference trace disappear when the temporary selection is cleared.
- Traces are rendered on the reference frame from the scientific phase recipe.
- Visibility is controlled per phase; selecting a phase changes which phase's reference traces are shown.
- Each phase uses one trace colour for all of its components.
- Trace colour, width, and dashed/solid style are adjustable per phase.
- Individual captured components can be deleted without deleting the rest of the phase.
- Trace visualization does not alter the scientific segmentation model.
