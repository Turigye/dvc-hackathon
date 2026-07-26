export type Point = { x: number; y: number };

/** Distance from a point to a finite line segment in the same coordinate space. */
export function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + projection * dx), point.y - (start.y + projection * dy));
}

export function segmentHitsCircle(start: Point, end: Point, centre: Point, radius: number) {
  return distanceToSegment(centre, start, end) <= radius;
}
