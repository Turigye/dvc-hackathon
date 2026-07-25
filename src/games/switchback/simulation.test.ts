import { describe, expect, it } from "vitest";
import { createSwitchbackState, step, type RunnerEntity } from "./simulation";

const obstacle = (overrides: Partial<RunnerEntity> = {}): RunnerEntity => ({
  id: 1,
  row: 1,
  kind: "piston",
  lane: 0,
  safeLane: 1,
  y: 0.69,
  ...overrides,
});

describe("Switchback endless-runner simulation", () => {
  it("moves one lane per left/right input and clamps at the road edges", () => {
    let state = createSwitchbackState({ spawnEnabled: false });

    state = step(state, 0, { move: -1 });
    state = step(state, 0, { move: -1 });
    expect(state.lane).toBe(-1);

    state = step(state, 0, { move: 1 });
    expect(state.lane).toBe(0);
  });

  it("fails only when a hazard crosses the runner in the occupied lane", () => {
    const hit = step(createSwitchbackState({ entities: [obstacle()], spawnEnabled: false }), 100, { move: 0 });
    const avoided = step(createSwitchbackState({ entities: [obstacle({ lane: -1 })], spawnEnabled: false }), 100, { move: 0 });

    expect(hit).toMatchObject({ failed: true, failure: "hazard" });
    expect(avoided).toMatchObject({ failed: false });
  });

  it("uses shield and boost pickups to protect the runner", () => {
    const shielded = step(createSwitchbackState({ entities: [obstacle()], shieldCharges: 1, spawnEnabled: false }), 100, { move: 0 });
    const boosted = step(createSwitchbackState({ entities: [obstacle()], boostMs: 1_000, spawnEnabled: false }), 100, { move: 0 });
    const pickup = step(createSwitchbackState({ entities: [obstacle({ kind: "shield" })], spawnEnabled: false }), 100, { move: 0 });

    expect(shielded).toMatchObject({ failed: false, shieldCharges: 0 });
    expect(boosted).toMatchObject({ failed: false, obstaclesSmashed: 1 });
    expect(pickup).toMatchObject({ failed: false, shieldCharges: 1 });
  });

  it("spawns endless fair rows with an adjacent safe lane", () => {
    let state = createSwitchbackState({ boostMs: 100_000 });
    const rows = new Map<number, RunnerEntity[]>();

    for (let tick = 0; tick < 180; tick += 1) {
      state = step(state, 100, { move: 0 });
      for (const entity of state.entities) {
        const row = rows.get(entity.row) ?? [];
        if (!row.some((item) => item.id === entity.id)) row.push(entity);
        rows.set(entity.row, row);
      }
    }

    expect(state.failed).toBe(false);
    expect(rows.size).toBeGreaterThan(8);
    const orderedRows = [...rows.entries()].sort(([a], [b]) => a - b).map(([, row]) => row);
    for (const row of orderedRows) {
      const hazards = row.filter((entity) => entity.kind === "piston" || entity.kind === "spikes");
      expect(new Set(hazards.map((entity) => entity.lane)).size).toBeLessThanOrEqual(2);
    }
    for (let index = 1; index < orderedRows.length; index += 1) {
      expect(Math.abs(orderedRows[index][0].safeLane - orderedRows[index - 1][0].safeLane)).toBeLessThanOrEqual(1);
    }
  });
});
