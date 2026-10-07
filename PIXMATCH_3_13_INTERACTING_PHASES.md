# PixMatch 3.13 — interacting CIELAB phase handling

## Scientific recipe capture
Capture recipe now includes the scientific phase workflow when CIELAB phase groups and/or scientific reference lines exist on the reference frame. A recipe can therefore preserve conventional measurements plus phase definitions, traced CIELAB components, measurement lines, and interaction policy.

## Interacting surfaces
Each phase component is first detected independently from its stored CIELAB/RGB reference. When two or more phases claim the same current pixel, PixMatch resolves the conflict using the stored reference colour evidence plus a spatial tie-break from the tracked component seed. The result is a phase-exclusive mask for measurement while preserving the original reference components for audit.

The scientific panel exposes:
- Resolve competing phases (default)
- Allow overlaps
- Ambiguity margin

Sequence results report overlap and close-match counts so interacting regimes can be reviewed instead of silently ignored.

## Universal scope
No fluid-specific names or assumptions are embedded. The same mechanism applies to any user-defined physical phases whose image appearance may interact, touch, or temporarily overlap.
