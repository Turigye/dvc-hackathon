import { describe, expect, test } from "vitest";
import { createSwarmState, stepSwarm, tapSwarm, type SwarmBug } from "./swarm-simulation";

const bug = (values: Partial<SwarmBug> & Pick<SwarmBug, "id" | "kind">): SwarmBug => ({
  x: 50, y: 50, vx: 0, vy: 0, r: 8, ...values,
});

describe("Swarm target fairness", () => {
  test("a queen is never lethal and needs three separated hits", () => {
    let state = createSwarmState({ spawnEnabled: false, bugs: [bug({ id: 1, kind: "queen", health: 3 })] });
    state = tapSwarm(state, 50, 50);
    expect(state.failed).toBe(false);
    expect(state.bugs[0]?.health).toBe(2);
    const ignored = tapSwarm(state, state.bugs[0]!.x, state.bugs[0]!.y);
    expect(ignored.bugs[0]?.health).toBe(2);
    state = stepSwarm(ignored, 650);
    state = tapSwarm(state, state.bugs[0]!.x, state.bugs[0]!.y);
    state = stepSwarm(state, 650);
    state = tapSwarm(state, state.bugs[0]!.x, state.bugs[0]!.y);
    expect(state.failed).toBe(false);
    expect(state.bugs.some((target) => target.kind === "queen")).toBe(false);
    expect(state.bosses).toBe(1);
  });

  test("pixel-normalized hit testing rejects vertically distant targets", () => {
    const state = createSwarmState({ spawnEnabled: false, bugs: [bug({ id: 1, kind: "predator", y: 62, r: 8 })] });
    expect(tapSwarm(state, 50, 50, 844 / 390).failed).toBe(false);
  });

  test("overlap resolves to the nearest target, not the oldest", () => {
    const state = createSwarmState({ spawnEnabled: false, bugs: [
      bug({ id: 1, kind: "predator", x: 48 }),
      bug({ id: 2, kind: "prey", x: 50 }),
    ] });
    const next = tapSwarm(state, 50, 50);
    expect(next.failed).toBe(false);
    expect(next.score).toBe(10);
  });

  test("five prey catches summon a visible queen and predator taps have a distinct failure", () => {
    let state = createSwarmState({ spawnEnabled: false });
    for (let id = 1; id <= 5; id++) {
      state = { ...state, bugs: [...state.bugs, bug({ id, kind: "prey" })] };
      state = tapSwarm(state, 50, 50);
    }
    expect(state.bloom).toBe(5);
    expect(state.bugs.find((target) => target.kind === "queen")?.health).toBe(3);
    const failed = tapSwarm({ ...state, bugs: [bug({ id: 9, kind: "predator" })] }, 50, 50);
    expect(failed.failure).toBe("predator");
  });

  test("only prey escaping costs lives", () => {
    const base = createSwarmState({ spawnEnabled: false, bugs: [
      bug({ id: 1, kind: "predator", x: 113, vx: 10 }),
      bug({ id: 2, kind: "prey", x: 113, vx: 10 }),
    ] });
    const next = stepSwarm(base, 200);
    expect(next.lives).toBe(2);
    expect(next.failed).toBe(false);
  });

  test("identical seeds and time steps produce identical boards", () => {
    let a = createSwarmState({ seed: 42 });
    let b = createSwarmState({ seed: 42 });
    for (let i = 0; i < 200; i++) { a = stepSwarm(a, 16); b = stepSwarm(b, 16); }
    expect(a).toEqual(b);
  });
});
