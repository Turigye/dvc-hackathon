import { describe, expect, it } from "vitest";
import { createSwitchbackState, step } from "./simulation";

describe("Switchback simulation", () => {
  it("gives the first turn a learnable reaction window before a flip is required", () => {
    let state = createSwitchbackState({ seed: 9, hazards: [] });

    state = step(state, 1_400, { flip: false });
    expect(state).toMatchObject({ failed: false, score: 0, segment: 0 });

    state = step(state, 0, { flip: true });
    state = step(state, 200, { flip: false });
    expect(state).toMatchObject({ failed: false, score: 1, segment: 1 });
  });

  it("clears one vertex after a tap and then fails at the next vertex without a tap", () => {
    let state = createSwitchbackState({ seed: 17 });

    state = step(state, 0, { flip: true });
    state = step(state, 1_620, { flip: false });

    expect(state).toMatchObject({ score: 1, segment: 1, failed: false });

    state = step(state, 1_600, { flip: false });

    expect(state).toMatchObject({ score: 1, segment: 1, failed: true, failure: "missed-vertex" });
  });

  it("awards a close-call bonus when a flipped runner escapes an imminent hazard", () => {
    let state = createSwitchbackState({ seed: 2, hazards: [{ segment: 0, lane: 0, impactAt: 0.92 }] });

    state = step(state, 1_600, { flip: true });

    expect(state).toMatchObject({ failed: false, closeCalls: 1, bonus: 1 });
  });
});
