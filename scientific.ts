import { labDistanceW, rgbToLab, type LAB, type RGB } from "./color";
import { detectRegion, relocateSeed, traceContour, type DetectOptions, type LabField, type Pt, type SegmentResult } from "./segmentation";
import type { Scale } from "./pixmatch";

export type ScientificComponent = {
  id: string;
  label: string;
  referenceLab: LAB;
  referenceRgb?: RGB;
  pointsRel: Pt[];
  /** Full traced reference contour in normalized image coordinates for audit/visibility. */
  contourRel?: Pt[];
  detect: DetectOptions;
  searchRadiusRel: number;
};

export type ScientificPhaseGroup = {
  id: string;
  name: string;
  role: "target" | "secondary";
  components: ScientificComponent[];
  traceColor?: string;
  traceWidth?: number;
  traceDashed?: boolean;
  traceVisible?: boolean;
};

/**
 * What a user-drawn reference line means. Roles are physical, not example-specific:
 *  - "height": the line defines the physical measurement axis; the current target phase extent
 *              is recomputed by projection of the current phase mask onto that axis.
 *  - "base":   a reference level. The extent of the target phase (its top boundary to this level)
 *              is measured against it. Requires a target phase.
 *  - "chord":  the width of the target phase mask cut by this line (e.g. a contact span).
 *              Requires a target phase.
 */
export type ScientificLineRole = "height" | "base" | "chord";

/** Appearance of one endpoint on the reference frame, used to find it again in other frames. */
export type LineAnchor = {
  /** Mean CIELAB / RGB of a small patch at the endpoint. */
  lab: LAB;
  rgb: RGB;
  /** CIELAB samples along the line axis, centred on the endpoint. */
  profile: LAB[];
};

export type ScientificLine = {
  id: string;
  role: ScientificLineRole;
  label: string;
  p1Rel: Pt;
  p2Rel: Pt;
  /** Only for role "height". */
  anchors?: [LineAnchor, LineAnchor];
  searchRadiusRel: number;
  /** 0..1 weight of L* when matching endpoints; <1 tolerates exposure drift. */
  lightnessWeight?: number;
  rgbWeight?: number;
};

export type ScientificRecipe = {
  groups: ScientificPhaseGroup[];
  /** Only the lines the user defined on the reference frame; nothing else is measured. */
  lines: ScientificLine[];
  scale: Scale;
  capturedFrom: string;
  capturedAt: string;
};

export type ScientificLineResult = {
  lineId: string;
  label: string;
  p1: Pt | null;
  p2: Pt | null;
  lengthPx: number | null;
  lengthPhysical: number | null;
  confidence: number;
  status: "VALID" | "LOW_CONFIDENCE" | "FAILED";
};

export type ScientificFrameResult = {
  phase: string;
  role: "target" | "secondary";
  heightPx: number | null;
  heightPhysical: number | null;
  contactDiameterPx: number | null;
  contactDiameterPhysical: number | null;
  topY: number | null;
  baselineY: number | null;
  componentCount: number;
  confidence: number;
  status: "VALID" | "LOW_CONFIDENCE" | "MISSING_PHASE" | "SEGMENTATION_FAILED";
  contour?: Pt[];
};

export function unionSegments(field: LabField, segments: SegmentResult[]): SegmentResult | null {
  if (!segments.length) return null;
  const n = field.width * field.height;
  const mask = new Uint8Array(n);
  let seedLab = segments[0].seedLab;
  let sumL = 0, sumA = 0, sumB = 0, count = 0;
  for (const seg of segments) {
    for (let i = 0; i < n; i++) if (seg.mask[i] && !mask[i]) {
      mask[i] = 1;
      sumL += field.L[i]; sumA += field.A[i]; sumB += field.B[i]; count++;
    }
  }
  if (!count) return null;
  let minX = field.width, minY = field.height, maxX = 0, maxY = 0, cxs = 0, cys = 0;
  for (let y = 0; y < field.height; y++) for (let x = 0; x < field.width; x++) {
    const i = y * field.width + x;
    if (!mask[i]) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    cxs += x; cys += y;
  }
  const pts = traceContour(mask, field.width, field.height);
  const perimeter = pts.reduce((p, a, i) => {
    const b = pts[(i + 1) % pts.length];
    return p + Math.hypot(b.x - a.x, b.y - a.y);
  }, 0);
  let feretMax = 0;
  for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 200))) {
    for (let j = i + 1; j < pts.length; j += Math.max(1, Math.floor(pts.length / 200))) {
      feretMax = Math.max(feretMax, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
    }
  }
  return {
    mask, width: field.width, height: field.height, contour: pts,
    areaPx: count, perimeterPx: perimeter,
    centroid: { x: cxs / count, y: cys / count },
    bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    circularity: perimeter ? Math.min(1, 4 * Math.PI * count / (perimeter * perimeter)) : 0,
    feretMax, feretMin: 0,
    meanLab: { L: sumL / count, a: sumA / count, b: sumB / count },
    seedLab,
  };
}

export function lineYAtX(line: ScientificLine, xRel: number, fallback: number) {
  const a = line.p1Rel, b = line.p2Rel;
  const dx = b.x - a.x;
  if (Math.abs(dx) < 1e-9) return a.y;
  return a.y + (b.y - a.y) * ((xRel - a.x) / dx);
}

/**
 * Width of a mask along an arbitrary line (extended across the image), tolerant to a thin
 * perpendicular band so a line lying exactly on the mask boundary still registers.
 */
export function chordSpan(mask: Uint8Array, width: number, height: number, a: Pt, b: Pt, band = 2) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 1e-6) return null;
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
  const nx = -uy, ny = ux;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const reach = width + height;
  let best: number | null = null;
  for (let o = -band; o <= band; o++) {
    let tMin = Infinity, tMax = -Infinity;
    for (let t = -reach; t <= reach; t += 0.5) {
      const x = Math.round(mx + ux * t + nx * o), y = Math.round(my + uy * t + ny * o);
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if (mask[y * width + x]) { tMin = Math.min(tMin, t); tMax = Math.max(tMax, t); }
    }
    if (Number.isFinite(tMin) && (best == null || tMax - tMin > best)) best = tMax - tMin;
  }
  return best;
}

/* ---------------- line endpoint learning + tracking (role "height") ---------------- */

/** Bilinear CIELAB sample so endpoints can be located to sub-pixel precision. */
function labAt(field: LabField, x: number, y: number): LAB {
  const fx = Math.max(0, Math.min(field.width - 1, x));
  const fy = Math.max(0, Math.min(field.height - 1, y));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = Math.min(field.width - 1, x0 + 1), y1 = Math.min(field.height - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  const at = (xx: number, yy: number, arr: Float32Array) => arr[yy * field.width + xx];
  const mix = (arr: Float32Array) =>
    (at(x0, y0, arr) * (1 - tx) + at(x1, y0, arr) * tx) * (1 - ty) +
    (at(x0, y1, arr) * (1 - tx) + at(x1, y1, arr) * tx) * ty;
  return { L: mix(field.L), a: mix(field.A), b: mix(field.B) };
}

function axisHalfWindow(lengthPx: number) {
  return Math.max(4, Math.min(12, Math.round(lengthPx * 0.03)));
}

/** Learn what each endpoint of a line looks like on the reference frame (CIELAB + RGB). */
export function captureLineAnchors(field: LabField, image: ImageData, a: Pt, b: Pt): [LineAnchor, LineAnchor] {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
  const w = axisHalfWindow(len);
  const make = (c: Pt): LineAnchor => {
    const profile: LAB[] = [];
    for (let t = -w; t <= w; t++) profile.push(labAt(field, c.x + ux * t, c.y + uy * t));
    let r = 0, g = 0, bl = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = Math.max(0, Math.min(image.width - 1, Math.round(c.x) + dx));
      const y = Math.max(0, Math.min(image.height - 1, Math.round(c.y) + dy));
      const o = (y * image.width + x) * 4;
      r += image.data[o]; g += image.data[o + 1]; bl += image.data[o + 2]; n++;
    }
    const rgb = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(bl / n) };
    return { lab: rgbToLab(rgb.r, rgb.g, rgb.b), rgb, profile };
  };
  return [make(a), make(b)];
}

/** Per-sample ΔE is clipped so an occluder or glare spot cannot dominate the match. */
const COST_CLIP = 30;

function locateEndpoint(
  field: LabField, anchor: LineAnchor, around: Pt, ux: number, uy: number, radiusPx: number, lightnessWeight: number, rgbWeight = 0.2,
): { p: Pt; cost: number } {
  const w = (anchor.profile.length - 1) / 2;
  const nx = -uy, ny = ux;
  const lateral = Math.max(2, Math.round(radiusPx * 0.25));
  const costAt = (s: number, l: number) => {
    const cx = around.x + ux * s + nx * l, cy = around.y + uy * s + ny * l;
    if (cx < 0 || cy < 0 || cx > field.width - 1 || cy > field.height - 1) return Infinity;
    let cost = 0;
    for (let t = -w; t <= w; t++) {
      let sum = 0;
      for (let o = -1; o <= 1; o++) {
        const sx = Math.max(0, Math.min(field.width - 1, Math.round(cx + ux * t + nx * o)));
        const sy = Math.max(0, Math.min(field.height - 1, Math.round(cy + uy * t + ny * o)));
        const lab = labAt(field, sx, sy);
        const i = sy * field.width + sx;
        const rgbD = Math.hypot(field.R[i] - anchor.rgb.r, field.G[i] - anchor.rgb.g, field.B8[i] - anchor.rgb.b) / Math.sqrt(3 * 255 * 255) * 100;
        const labD = labDistanceW(anchor.profile[t + w], lab, "cie76", lightnessWeight);
        sum += Math.min(COST_CLIP, (1 - rgbWeight) * labD + rgbWeight * rgbD);
      }
      cost += sum / 3;
    }
    return cost / anchor.profile.length;
  };
  // Coarse integer search with a small preference for staying near the previous position.
  let best = { s: 0, l: 0, cost: Infinity };
  for (let l = -lateral; l <= lateral; l++) {
    for (let s = -radiusPx; s <= radiusPx; s++) {
      const c = costAt(s, l);
      if (!Number.isFinite(c)) continue;
      const biased = c + 0.5 * (Math.abs(s) + Math.abs(l)) / Math.max(1, radiusPx);
      if (biased < best.cost) best = { s, l, cost: biased };
    }
  }
  if (!Number.isFinite(best.cost)) return { p: around, cost: Infinity };
  // Sub-pixel refinement: parabola through the cost at s-1, s, s+1 along the axis.
  let sSub = best.s;
  const cm = costAt(best.s - 1, best.l), c0 = costAt(best.s, best.l), cp = costAt(best.s + 1, best.l);
  if (Number.isFinite(cm) && Number.isFinite(c0) && Number.isFinite(cp)) {
    const denom = cm - 2 * c0 + cp;
    if (denom > 1e-6) sSub = best.s + Math.max(-0.5, Math.min(0.5, (0.5 * (cm - cp)) / denom));
  }
  return { p: { x: around.x + ux * sSub + nx * best.l, y: around.y + uy * sSub + ny * best.l }, cost: costAt(best.s, best.l) };
}

/** Re-locate both endpoints of a "height" line in another frame and return its length. */
export function trackHeightLine(
  field: LabField,
  line: ScientificLine,
  scale: Scale,
  prior?: [Pt, Pt],
): { result: ScientificLineResult; endpoints: [Pt, Pt] | null } {
  const a0 = { x: line.p1Rel.x * field.width, y: line.p1Rel.y * field.height };
  const b0 = { x: line.p2Rel.x * field.width, y: line.p2Rel.y * field.height };
  const fail = (): { result: ScientificLineResult; endpoints: null } => ({
    result: { lineId: line.id, label: line.label, p1: null, p2: null, lengthPx: null, lengthPhysical: null, confidence: 0, status: "FAILED" },
    endpoints: null,
  });
  if (!line.anchors) return fail();
  const len = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  if (len < 1e-6) return fail();
  // The axis is fixed by the reference geometry; endpoints slide along it (and a little across it).
  const ux = (b0.x - a0.x) / len, uy = (b0.y - a0.y) / len;
  const radiusPx = Math.max(4, Math.round(line.searchRadiusRel * Math.max(field.width, field.height)));
  const lw = line.lightnessWeight ?? 1;
  const rw = line.rgbWeight ?? 0.2;
  const A = locateEndpoint(field, line.anchors[0], prior?.[0] ?? a0, ux, uy, radiusPx, lw, rw);
  const B = locateEndpoint(field, line.anchors[1], prior?.[1] ?? b0, ux, uy, radiusPx, lw, rw);
  if (!Number.isFinite(A.cost) || !Number.isFinite(B.cost)) return fail();
  const lengthPx = Math.hypot(B.p.x - A.p.x, B.p.y - A.p.y);
  const confidence = Math.max(0, Math.min(1, 1 - Math.max(A.cost, B.cost) / 30));
  return {
    result: {
      lineId: line.id, label: line.label, p1: A.p, p2: B.p,
      lengthPx,
      lengthPhysical: scale.pxPerUnit ? lengthPx / scale.pxPerUnit : null,
      confidence,
      status: lengthPx < 1 ? "FAILED" : confidence < 0.5 ? "LOW_CONFIDENCE" : "VALID",
    },
    endpoints: [A.p, B.p],
  };
}

export function segmentScientificGroup(
  field: LabField,
  group: ScientificPhaseGroup,
  priorSeeds?: Map<string, Pt>,
) {
  const segments: SegmentResult[] = [];
  const nextSeeds = new Map<string, Pt>();
  for (const component of group.components) {
    const rel = component.pointsRel[0];
    const around = priorSeeds?.get(component.id) ?? { x: rel.x * field.width, y: rel.y * field.height };
    const radius = Math.max(4, Math.round(component.searchRadiusRel * Math.max(field.width, field.height)));
    let relocated = relocateSeed(field, component.referenceLab, around, radius, component.detect.metric, component.detect.lightnessWeight ?? 1, component.referenceRgb, component.detect.rgbWeight ?? 0.2);
    let seg = detectRegion(field, relocated.seed, component.detect);
    if (!seg) {
      relocated = relocateSeed(field, component.referenceLab, around, radius * 2, component.detect.metric, component.detect.lightnessWeight ?? 1, component.referenceRgb, component.detect.rgbWeight ?? 0.2);
      seg = detectRegion(field, relocated.seed, component.detect);
    }
    if (seg) {
      segments.push(seg);
      nextSeeds.set(component.id, seg.centroid);
    }
  }
  return { segment: unionSegments(field, segments), seeds: nextSeeds, componentCount: segments.length };
}

/**
 * Phase-level quantities. Only what the user defined on the reference frame is computed:
 * extent needs a "base" line, span needs a "chord" line; without them the field stays null.
 */
export function extentAlongAxis(mask: Uint8Array, width: number, height: number, a: Pt, b: Pt) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 1e-6) return null;
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
  let minT = Infinity, maxT = -Infinity;
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!mask[y * width + x]) continue;
    const t = (x - cx) * ux + (y - cy) * uy;
    minT = Math.min(minT, t); maxT = Math.max(maxT, t);
  }
  return Number.isFinite(minT) ? maxT - minT : null;
}

export function measureScientificPhase(
  segment: SegmentResult,
  recipe: ScientificRecipe,
  scale: Scale,
  group: ScientificPhaseGroup,
  componentCount = 1,
): ScientificFrameResult {
  const heightLine = recipe.lines.find((l) => l.role === "height");
  const baseLine = recipe.lines.find((l) => l.role === "base");
  const chordLine = recipe.lines.find((l) => l.role === "chord");
  const topY = segment.bbox.y;
  let baselineY: number | null = null;
  let heightPx: number | null = null;
  if (heightLine) {
    heightPx = extentAlongAxis(
      segment.mask, segment.width, segment.height,
      { x: heightLine.p1Rel.x * segment.width, y: heightLine.p1Rel.y * segment.height },
      { x: heightLine.p2Rel.x * segment.width, y: heightLine.p2Rel.y * segment.height },
    );
  } else if (baseLine) {
    baselineY = lineYAtX(baseLine, segment.centroid.x / segment.width, 0) * segment.height;
    heightPx = Math.max(0, baselineY - topY);
  }
  let spanPx: number | null = null;
  if (chordLine) {
    spanPx = chordSpan(
      segment.mask, segment.width, segment.height,
      { x: chordLine.p1Rel.x * segment.width, y: chordLine.p1Rel.y * segment.height },
      { x: chordLine.p2Rel.x * segment.width, y: chordLine.p2Rel.y * segment.height },
      Math.max(1, Math.round(segment.height * 0.004)),
    );
  }
  const coverage = segment.areaPx / Math.max(1, segment.width * segment.height);
  const confidence = Math.max(0, Math.min(1, 0.75 + Math.min(0.25, coverage * 20)));
  return {
    phase: group.name,
    role: group.role,
    heightPx,
    heightPhysical: heightPx != null && scale.pxPerUnit ? heightPx / scale.pxPerUnit : null,
    contactDiameterPx: spanPx,
    contactDiameterPhysical: spanPx != null && scale.pxPerUnit ? spanPx / scale.pxPerUnit : null,
    topY,
    baselineY,
    componentCount,
    confidence,
    status: confidence < 0.5 ? "LOW_CONFIDENCE" : "VALID",
    contour: segment.contour,
  };
}
