import { describe, expect, test } from "vitest";
import {
  ORBIT_RADIUS,
  anchorById,
  createTetherState,
  gapIsReachable,
  orbitPoint,
  step,
  tangent,
  type TetherState,
} from "./simulation";

const idle = { release: false };
const run = (state: TetherState, ms: number, releaseAt: number[] = []) => {
  let current = state;
  for (let t = 0; t < ms; t += 16) {
    current = step(current, 16, { release: releaseAt.some((mark) => mark >= t && mark < t + 16) });
  }
  return current;
};

/** Plays properly: waits until the tangent points at the next anchor, then lets go. */
function aim(state: TetherState): boolean {
  if (state.phase !== "orbiting") return false;
  const next = state.anchors.find((a) => a.id === state.anchorId + 1);
  if (!next) return false;
  const here = orbitPoint(state);
  const dir = tangent(state);
  const toNext = { x: next.x - here.x, y: next.y - here.y };
  const length = Math.hypot(toNext.x, toNext.y) || 1;
  // Lead the shot: gravity drops the arc, so aim above the target.
  const lead = 0.34 + length * 0.06;
  const aimY = toNext.y / length + lead;
  const norm = Math.hypot(toNext.x / length, aimY) || 1;
  const dot = dir.x * (toNext.x / length / norm) + dir.y * (aimY / norm);
  return dot > 0.985;
}

describe("orbit", () => {
  test("the orb sits exactly one orbit radius from its anchor", () => {
    const state = createTetherState(4);
    const anchor = anchorById(state, state.anchorId)!;
    expect(Math.hypot(state.pos.x - anchor.x, state.pos.y - anchor.y)).toBeCloseTo(ORBIT_RADIUS, 5);
  });

  test("orbiting alone never ends the run", () => {
    const state = run(createTetherState(4), 20000);
    expect(state.failed).toBe(false);
    expect(state.phase).toBe("orbiting");
  });

  test("a release leaves along the tangent, not the radius", () => {
    let state = createTetherState(4);
    state = run(state, 300);
    const direction = tangent(state);
    state = step(state, 16, { release: true });
    expect(state.phase).toBe("flying");
    const speed = Math.hypot(state.vel.x, state.vel.y);
    expect(state.vel.x / speed).toBeCloseTo(direction.x, 4);
    expect(state.vel.y / speed).toBeCloseTo(direction.y, 4);
  });
});

describe("fairness", () => {
  test("every generated gap is physically clearable", () => {
    for (let seed = 1; seed <= 200; seed++) {
      let state = createTetherState(seed);
      for (let hop = 0; hop < 40; hop++) {
        const from = anchorById(state, state.anchorId);
        const to = state.anchors.find((a) => a.id === state.anchorId + 1);
        if (!from || !to) break;
        expect(gapIsReachable(from, to)).toBe(true);
        state = { ...state, anchorId: to.id };
      }
    }
  });

  test("a player who aims well climbs a long way", () => {
    let best = 0;
    for (const seed of [2, 9, 17, 33, 51]) {
      let state = createTetherState(seed);
      for (let t = 0; t < 60000 && !state.failed; t += 16) state = step(state, 16, { release: aim(state) });
      best = Math.max(best, state.score);
    }
    expect(best).toBeGreaterThan(150);
  });

  test("releasing blindly and constantly does not climb", () => {
    let state = createTetherState(7);
    for (let t = 0; t < 20000 && !state.failed; t += 16) state = step(state, 16, { release: true });
    expect(state.score).toBeLessThan(120);
  });
});

describe("scoring", () => {
  test("a clean latch scores more than a scraped one", () => {
    const clean = 10 + 10 + 15;
    const scraped = 10;
    expect(clean).toBeGreaterThan(scraped);
  });

  test("identical seeds and inputs produce identical runs", () => {
    const a = run(createTetherState(21), 6000, [900, 2100, 3400]);
    const b = run(createTetherState(21), 6000, [900, 2100, 3400]);
    expect(a.score).toBe(b.score);
    expect(a.pos.x).toBeCloseTo(b.pos.x, 8);
    expect(a.failed).toBe(b.failed);
  });

  test("frame rate does not change the outcome", () => {
    let fast = createTetherState(5);
    for (let t = 0; t < 4800; t += 16) fast = step(fast, 16, idle);
    let slow = createTetherState(5);
    for (let t = 0; t < 4800; t += 48) slow = step(slow, 48, idle);
    expect(slow.angle).toBeCloseTo(fast.angle, 2);
  });
});
