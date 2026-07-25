/**
 * Ribbon geometry. Maps simulation coordinates (segment, offset, rail) onto
 * the zigzag from the reference poster. Pure — safe to unit test.
 *
 * World space: x runs 0..100 across the ribbon's swing, y increases downward
 * by SEGMENT_H per segment. Even segments run left-to-right, odd right-to-left,
 * which is what folds the rails at every vertex.
 */

export const SEGMENT_H = 52;
export const SWING_LEFT = 18;
export const SWING_RIGHT = 82;
/** Half the ribbon's width, in world units, measured perpendicular-ish. */
export const RAIL_OFFSET = 11;

export const vertexX = (segment: number) => (segment % 2 === 0 ? SWING_LEFT : SWING_RIGHT);

/** Centre line of the ribbon at (segment, offset). */
export function centre(segment: number, offset: number) {
  const from = vertexX(segment);
  const to = vertexX(segment + 1);
  return { x: from + (to - from) * offset, y: segment * SEGMENT_H + offset * SEGMENT_H };
}

/**
 * A point on one of the two rails. Rail 0 sits on the left of the ribbon's
 * direction of travel, rail 1 on the right — so the physical side each rail
 * occupies swaps at every vertex, exactly as the simulation models it.
 */
export function railPoint(segment: number, offset: number, rail: 0 | 1) {
  const { x, y } = centre(segment, offset);
  const direction = segment % 2 === 0 ? 1 : -1;
  return { x: x + (rail === 0 ? -RAIL_OFFSET : RAIL_OFFSET) * direction, y };
}

/** Polyline for the ribbon's centre across a range of segments. */
export function ribbonPath(fromSegment: number, toSegment: number) {
  const points: string[] = [];
  for (let segment = fromSegment; segment <= toSegment + 1; segment++) {
    const { x, y } = centre(segment, 0);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}
