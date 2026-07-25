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

describe("the pursuer", () => {
  test("stays asleep until the player has found their footing", () => {
    const early = run(createSwitchbackState({ seed: 3, spawnEnabled: false }), 3000);
    expect(early.score).toBeLessThan(8);
    expect(early.chaserActive).toBe(false);
  });

  test("wakes and then closes on its own", () => {
    const woken = run(createSwitchbackState({ seed: 3, spawnEnabled: false }), 14000);
    expect(woken.chaserActive).toBe(true);
    expect(woken.failed).toBe(false);
    const later = run(woken, 2000);
    expect(later.chaseGap).toBeLessThan(woken.chaseGap);
  });

  test("closes the full gap in well under half a minute of safe play", () => {
    let state = createSwitchbackState({ seed: 3, spawnEnabled: false });
    let ms = 0;
    while (!state.failed && ms < 60000) { state = step(state, 16, idle); ms += 16; }
    expect(state.failure).toBe("caught");
    expect(ms).toBeLessThan(35000);
  });

  test("catches a player who never takes a risk", () => {
    // No hazards, so nothing can push the pursuer back. Safety alone loses.
    const state = run(createSwitchbackState({ seed: 3, spawnEnabled: false }), 200000);
    expect(state.failed).toBe(true);
    expect(state.failure).toBe("caught");
  });

  test("risk buys distance — a near miss pushes it back", () => {
    // Start on rail 1 so the fold at segment 1 puts the runner on rail 0, clearing
    // the rail-1 hazard closely rather than colliding with it.
    const base = createSwitchbackState({ seed: 3, spawnEnabled: false, rail: 1, chaserActive: true, chaseGap: 2 });
    const withRisk = { ...base, hazards: [{ id: 1, kind: "piston" as const, segment: 1, rail: 1 as const, from: 0.4, to: 0.49 }] };
    const safe = run(base, 4000);
    const risky = run(withRisk, 4000);
    expect(risky.bestCombo).toBeGreaterThan(0);
    expect(risky.chaseGap).toBeGreaterThan(safe.chaseGap);
  });

  test("the gap is capped so the pursuer never disappears", () => {
    let state = createSwitchbackState({ seed: 3, spawnEnabled: false, chaserActive: true, chaseGap: 4.2 });
    for (let i = 0; i < 40; i++) state = step(state, 16, idle);
    expect(state.chaseGap).toBeLessThanOrEqual(4.2);
  });
});

describe("drag bands", () => {
  const band = { id: 90, kind: "drag" as const, segment: 1, rail: 1 as const, from: 0.25, to: 0.6 };

  test("running through a drag band slows the runner", () => {
    const clear = run(createSwitchbackState({ seed: 5, spawnEnabled: false, rail: 0 }), 6000);
    const dragged = run(createSwitchbackState({ seed: 5, spawnEnabled: false, rail: 0, drags: [band] }), 6000);
    expect(dragged.progress).toBeLessThan(clear.progress);
    expect(dragged.failed).toBe(false);
  });

  test("a drag band lets the pursuer close far faster", () => {
    const base = { seed: 5, spawnEnabled: false, rail: 0 as const, chaserActive: true, chaseGap: 2 };
    const clear = run(createSwitchbackState(base), 6000);
    const dragged = run(createSwitchbackState({ ...base, drags: [band] }), 6000);
    expect(dragged.chaseGap).toBeLessThan(clear.chaseGap);
  });

  test("drag bands are never lethal", () => {
    const dragged = run(createSwitchbackState({ seed: 5, spawnEnabled: false, rail: 0, drags: [band] }), 20000);
    expect(dragged.failure).not.toBe("hazard");
  });
});

describe("chase balance", () => {
  /** Commits to the risky rail: dodges late, then rides sprint pads. */
  const skilled = (s: SwitchbackState) => {
    const seg = segmentOf(s.progress); const at = offsetOf(s.progress);
    const here = s.rail; const there: Rail = here === 0 ? 1 : 0;
    const lethal = (r: Rail, p: number) => s.hazards.some((h) => h.segment === seg && hazardCovers(h, r, p));
    if (lethal(here, at + 0.05)) return !lethal(there, at + 0.05);
    const sprint = s.drags.find((b) => b.kind === "sprint" && b.segment === seg && b.rail === there && b.to > at);
    if (sprint) {
      for (let p = at; p <= sprint.from + 0.02; p += 0.02) if (lethal(there, p)) return false;
      return true;
    }
    return false;
  };

  test("a skilled player can out-run the pursuer", () => {
    let best = 0;
    for (const seed of [4, 11, 23, 37, 58]) {
      let s = createSwitchbackState({ seed });
      for (let t = 0; t < 5000 && !s.failed; t++) s = step(s, 16, { flip: skilled(s) });
      best = Math.max(best, s.score);
    }
    // Escaping is possible: at least one seed survives well past the point
    // where a passive player is always caught.
    expect(best).toBeGreaterThan(60);
  });

  test("a passive player is still caught", () => {
    let s = createSwitchbackState({ seed: 4, spawnEnabled: false });
    let ms = 0;
    while (!s.failed && ms < 60000) { s = step(s, 16, idle); ms += 16; }
    expect(s.failure).toBe("caught");
  });
});
