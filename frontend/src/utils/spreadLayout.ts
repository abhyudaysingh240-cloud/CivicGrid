/**
 * spreadLayout.ts
 * ───────────────
 * Pure, memoisation-friendly layout helper for the CivicGrid topology canvas.
 * Reads node positions, spreads them from their centroid, then runs a
 * collision-avoidance pass. NEVER mutates the source data.
 *
 * TUNABLE CONSTANTS (adjust these freely):
 *   LAYOUT_SPREAD       — multiplier for how far nodes spread from centroid (1.0 = original)
 *   NODE_BOX_W          — assumed node card width in px for overlap detection
 *   NODE_BOX_H          — assumed node card height in px for overlap detection
 *   COLLISION_PAD       — extra clearance gap between node boxes (px)
 *   COLLISION_ITERS     — number of relaxation passes (more = cleaner, slightly slower)
 *
 * How to revert: set LAYOUT_SPREAD to 1.0 and COLLISION_ITERS to 0 in this file,
 * or delete this file and remove its import and usage from TopologyCanvas.tsx.
 */

// ── Tunable constants ────────────────────────────────────────────────────────
export const LAYOUT_SPREAD    = 1.65;   // scale factor from centroid (1.0 = no change)
export const NODE_BOX_W       = 220;    // card width used for overlap detection (px)
export const NODE_BOX_H       = 90;     // card height used for overlap detection (px)
export const COLLISION_PAD    = 24;     // minimum gap between node boxes (px)
export const COLLISION_ITERS  = 8;      // relaxation iteration count

// ── Types ────────────────────────────────────────────────────────────────────
export interface LayoutPoint {
  id: string;
  x: number;
  y: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns centroid of all points. */
function centroid(pts: LayoutPoint[]): { cx: number; cy: number } {
  if (pts.length === 0) return { cx: 0, cy: 0 };
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { cx, cy };
}

/** Scale each point away from centroid by `factor`. */
function scaleFromCentroid(pts: LayoutPoint[], factor: number): LayoutPoint[] {
  const { cx, cy } = centroid(pts);
  return pts.map(p => ({
    id: p.id,
    x: cx + (p.x - cx) * factor,
    y: cy + (p.y - cy) * factor,
  }));
}

/** Single collision-avoidance relaxation pass.
 *  For every overlapping pair, push each node half the overlap distance apart. */
function relaxOnce(pts: LayoutPoint[], padW: number, padH: number): LayoutPoint[] {
  // Work on a mutable copy
  const pos = pts.map(p => ({ ...p }));
  const n = pos.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = pos[i];
      const b = pos[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const overlapX = padW - Math.abs(dx);
      const overlapY = padH - Math.abs(dy);

      // Only if both axes overlap (AABB overlap test)
      if (overlapX > 0 && overlapY > 0) {
        // Push along the axis of smallest overlap
        if (overlapX < overlapY) {
          const push = overlapX / 2 + 1;
          if (dx >= 0) { a.x -= push; b.x += push; }
          else         { a.x += push; b.x -= push; }
        } else {
          const push = overlapY / 2 + 1;
          if (dy >= 0) { a.y -= push; b.y += push; }
          else         { a.y += push; b.y -= push; }
        }
      }
    }
  }

  return pos;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Compute a spread, collision-free layout from raw node positions.
 * Returns a Map<id, {x, y}> for O(1) lookup in the caller.
 *
 * @param rawNodes   Array of {id, x, y} from source data
 * @param spread     Spread factor override (default: LAYOUT_SPREAD)
 */
export function computeSpreadLayout(
  rawNodes: LayoutPoint[],
  spread: number = LAYOUT_SPREAD
): Map<string, { x: number; y: number }> {
  if (rawNodes.length === 0) return new Map();

  // 1. Scale outward from centroid
  let pts = scaleFromCentroid(rawNodes, spread);

  // 2. Collision-avoidance relaxation passes
  const padW = NODE_BOX_W + COLLISION_PAD;
  const padH = NODE_BOX_H + COLLISION_PAD;
  for (let iter = 0; iter < COLLISION_ITERS; iter++) {
    pts = relaxOnce(pts, padW, padH);
  }

  // 3. Return as a lookup map
  const result = new Map<string, { x: number; y: number }>();
  pts.forEach(p => result.set(p.id, { x: Math.round(p.x), y: Math.round(p.y) }));
  return result;
}
