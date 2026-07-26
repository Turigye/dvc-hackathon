import { describe, expect, it } from "vitest";
import { distanceToSegment, segmentHitsCircle } from "./pointer-geometry";

describe("pointer segment collision", () => {
  it("detects a fast swipe that crosses a target between pointer samples", () => {
    expect(segmentHitsCircle({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 4 }, 5)).toBe(true);
  });

  it("does not extend collision beyond the ends of the swipe", () => {
    expect(segmentHitsCircle({ x: 20, y: 20 }, { x: 40, y: 20 }, { x: 5, y: 20 }, 6)).toBe(false);
  });

  it("handles a stationary pointer sample", () => {
    expect(distanceToSegment({ x: 4, y: 3 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5);
  });
});
