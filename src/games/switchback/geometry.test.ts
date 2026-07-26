import { describe, expect, test } from "vitest";
import { railPoint, runnerPose, type RunnerJump } from "./geometry";

describe("Switchback runner presentation", () => {
  const jump: RunnerJump = { fromRail: 0, toRail: 1, startProgress: 0.2 };

  test("starts on the source rail, lifts between rails, and settles on the destination", () => {
    const start = runnerPose(0.2, 1, jump);
    const middle = runnerPose(0.28, 1, jump);
    const end = runnerPose(0.36, 1, jump);
    const source = railPoint(0, 0.2, 0);
    const destination = railPoint(0, 0.36, 1);

    expect(start.x).toBeCloseTo(source.x);
    expect(start.y).toBeCloseTo(source.y);
    expect(middle.jumping).toBe(true);
    expect(middle.y).toBeLessThan(railPoint(0, 0.28, 0).y);
    expect(end.x).toBeCloseTo(destination.x);
    expect(end.y).toBeCloseTo(destination.y);
    expect(end.jumping).toBe(false);
  });

  test("mirrors toward the side of travel during each transfer", () => {
    const rightward = runnerPose(0.25, 1, jump);
    const leftward = runnerPose(0.25, 0, { fromRail: 1, toRail: 0, startProgress: 0.2 });

    expect(rightward.facing).toBe(1);
    expect(leftward.facing).toBe(-1);
    expect(Math.sign(rightward.lean)).toBe(-1);
    expect(Math.sign(leftward.lean)).toBe(1);
  });
});
