/**
 * Ribbon geometry. Maps simulation coordinates (segment, offset, rail) onto
 * the zigzag from the reference poster. Pure — safe to unit test.
 *
 * World space: x runs 0..100 across the ribbon's swing, y increases downward
 * by SEGMENT_H per segment. Even segments run left-to-right, odd right-to-left,
 * which is what folds the rails at every vertex.
 */

export const SEGMENT_H = 52;
export const SWING_LEFT = 25;
export const SWING_RIGHT = 75;
/** Half the ribbon's width, in world units, measured perpendicular-ish. */
export const RAIL_OFFSET = 10;

export const vertexX = (segment: number) => (segment % 2 === 0 ? SWING_LEFT : SWING_RIGHT);

export type RunnerJump = {
  fromRail: 0 | 1;
  toRail: 0 | 1;
  startProgress: number;
};

/** Presentation-only pose for a tap-driven rail transfer. Collision remains
 * instantaneous in the simulation; the sprite eases across it over 0.16 of a
 * segment and lifts slightly so the action reads as a jump instead of a snap. */
export function runnerPose(progress: number, rail: 0 | 1, jump: RunnerJump | null) {
  const segment = Math.floor(progress);
  const offset = progress - segment;
  const destination = railPoint(segment, offset, rail);
  const rawPhase = jump ? (progress - jump.startProgress) / 0.16 : 1;
  const phase = Math.max(0, Math.min(1, rawPhase));

  if (!jump || phase >= 0.999) {
    return { ...destination, facing: segment % 2 === 0 ? 1 : -1, lean: 0, jumping: false, phase: 1 };
  }

  const from = railPoint(segment, offset, jump.fromRail);
  const to = railPoint(segment, offset, jump.toRail);
  const eased = phase * phase * (3 - 2 * phase);
  const direction = to.x >= from.x ? 1 : -1;
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased - Math.sin(Math.PI * eased) * 4.2,
    facing: direction,
    lean: direction * -12 * Math.sin(Math.PI * eased),
    jumping: true,
    phase,
  };
}

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

/** Polyline for one rail across a range of segments — the two lines the runner moves between. */
export function railPath(fromSegment: number, toSegment: number, rail: 0 | 1) {
  const points: string[] = [];
  for (let segment = fromSegment; segment <= toSegment; segment++) {
    for (const offset of [0, 1]) {
      const { x, y } = railPoint(segment, offset, rail);
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
  }
  return points.join(" ");
}
