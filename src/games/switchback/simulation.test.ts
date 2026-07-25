import { describe, expect, test } from "vitest";
import {
  auditSegment,
  createSwitchbackState,
  hazardCovers,
  offsetOf,
  segmentOf,
  step,
  MIN_TELEGRAPH_MS,
  worstCaseTelegraphMs,
  type Hazard,
  type Rail,
  type SwitchbackState,
} from "./simulation";

const idle = { flip: false };
const run = (state: SwitchbackState, ms: number, flipAt: number[] = []) => {
  let current = state;
  for (let elapsed = 0; elapsed < ms; elapsed += 16) {
    const flip = flipAt.some((mark) => mark >= elapsed && mark < elapsed + 16);
    current = step(current, 16, { flip });
  }
  return current;
};

describe("ribbon geometry", () => {
  test("crossing a vertex inverts the runner's rail without input", () => {
    let state = createSwitchbackState({ seed: 5, spawnEnabled: false, rail: 0 });
    while (segmentOf(state.progress) === 0) state = step(state, 16, idle);
    expect(segmentOf(state.progress)).toBe(1);
    expect(state.rail).toBe(1);
  });

  test("a tap immediately before a vertex cancels the fold", () => {
    let state = createSwitchbackState({ seed: 5, spawnEnabled: false, rail: 0 });
    while (offsetOf(state.progress) < 0.95 && segmentOf(state.progress) === 0) state = step(state, 16, idle);
    state = step(state, 16, { flip: true });
    while (segmentOf(state.progress) === 0) state = step(state, 16, idle);
    expect(state.rail).toBe(0);
  });

  test("score advances one per vertex cleared", () => {
    const state = run(createSwitchbackState({ seed: 5, spawnEnabled: false }), 8000);
    expect(state.score).toBe(segmentOf(state.progress));
  });
});

describe("hazards", () => {
  const piston = (rail: Rail): Hazard => ({ id: 1, kind: "piston", segment: 1, rail, from: 0.4, to: 0.49 });

  test("a hazard on the runner's rail is lethal", () => {
    // The fold at segment 1 puts a rail-0 runner onto rail 1, into the piston.
    const state = run(createSwitchbackState({ seed: 5, spawnEnabled: false, rail: 0, hazards: [piston(1)] }), 6000);
    expect(state.failed).toBe(true);
    expect(state.failure).toBe("hazard");
  });

  test("the opposite rail survives the same hazard", () => {
    const state = run(createSwitchbackState({ seed: 5, spawnEnabled: false, rail: 0, hazards: [piston(0)] }), 6000);
    expect(state.failed).toBe(false);
  });

  test("a sweeper is lethal on both rails, at different times", () => {
    const sweeper: Hazard = { id: 2, kind: "sweeper", segment: 1, rail: 0, from: 0.3, to: 0.64, switchAt: 0.47 };
    expect(hazardCovers(sweeper, 0, 0.35)).toBe(true);
    expect(hazardCovers(sweeper, 1, 0.35)).toBe(false);
    expect(hazardCovers(sweeper, 0, 0.55)).toBe(false);
    expect(hazardCovers(sweeper, 1, 0.55)).toBe(true);
  });

  test("a shield absorbs one hit and is consumed", () => {
    const state = run(createSwitchbackState({ seed: 5, spawnEnabled: false, rail: 0, shield: 1, hazards: [piston(1)] }), 6000);
    expect(state.failed).toBe(false);
    expect(state.shield).toBe(0);
  });
});

describe("fairness", () => {
  test("every hazard is visible far longer than the minimum telegraph", () => {
    expect(worstCaseTelegraphMs()).toBeGreaterThan(MIN_TELEGRAPH_MS);
  });

  test("no generated segment closes both rails, and none sits on a vertex", () => {
    let audited = 0;
    for (let seed = 1; seed <= 60; seed++) {
      let state = createSwitchbackState({ seed });
      for (let tick = 0; tick < 600; tick++) {
        state = step(state, 16, idle);
        if (state.failed) state = createSwitchbackState({ seed: seed * 31 + tick });
      }
      const bySegment = new Map<number, Hazard[]>();
      for (const hazard of state.hazards) {
        bySegment.set(hazard.segment, [...(bySegment.get(hazard.segment) ?? []), hazard]);
      }
      for (const hazards of bySegment.values()) {
        expect(auditSegment(hazards).reason).toBe(null);
        audited += 1;
      }
    }
    expect(audited).toBeGreaterThan(50);
  });

  test("correct play survives a long run", () => {
    let state = createSwitchbackState({ seed: 9 });
    for (let tick = 0; tick < 3000 && !state.failed; tick++) {
      const segment = segmentOf(state.progress);
      const ahead = offsetOf(state.progress) + 0.03;
      const here = state.rail;
      const there: Rail = here === 0 ? 1 : 0;
      const doomed = state.hazards.some((h) => h.segment === segment && hazardCovers(h, here, ahead));
      const escapeSafe = !state.hazards.some((h) => h.segment === segment && hazardCovers(h, there, ahead));
      state = step(state, 16, { flip: doomed && escapeSafe });
    }
    expect(state.score).toBeGreaterThan(20);
  });
});

describe("risk, reward and determinism", () => {
  test("clearing a hazard closely scores a near miss and builds combo", () => {
    const hazard: Hazard = { id: 3, kind: "piston", segment: 1, rail: 1, from: 0.4, to: 0.49 };
    const state = run(createSwitchbackState({ seed: 5, spawnEnabled: false, rail: 1, hazards: [hazard] }), 6000);
    expect(state.failed).toBe(false);
    expect(state.bestCombo).toBeGreaterThan(0);
  });

  test("identical seeds and inputs produce identical runs", () => {
    const a = run(createSwitchbackState({ seed: 42 }), 5000, [1200, 2400, 3600]);
    const b = run(createSwitchbackState({ seed: 42 }), 5000, [1200, 2400, 3600]);
    expect(a.score).toBe(b.score);
    expect(a.progress).toBeCloseTo(b.progress, 8);
    expect(a.failed).toBe(b.failed);
  });

  test("frame rate does not change the outcome", () => {
    const fast = run(createSwitchbackState({ seed: 7, spawnEnabled: false }), 4000);
    let slow = createSwitchbackState({ seed: 7, spawnEnabled: false });
    for (let tick = 0; tick < 80; tick++) slow = step(slow, 50, idle); // 80 x 50ms = 4000ms
    expect(slow.progress).toBeCloseTo(fast.progress, 2);
  });
});
