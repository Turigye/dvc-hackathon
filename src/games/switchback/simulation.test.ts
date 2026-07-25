import { describe, expect, it } from "vitest";
import { createSwitchbackState, step } from "./simulation";

describe("Switchback simulation", () => {
  it("clears one vertex after a tap and then fails at the next vertex without a tap", () => {
    let state = createSwitchbackState({ seed: 17 });

    state = step(state, 0, { flip: true });
    state = step(state, 1_400, { flip: false });

    expect(state).toMatchObject({ score: 1, segment: 1, failed: false });

    state = step(state, 1_400, { flip: false });

    expect(state).toMatchObject({ score: 1, segment: 1, failed: true, failure: "missed-vertex" });
  });

  it("awards a close-call bonus when a flipped runner escapes an imminent hazard", () => {
    let state = createSwitchbackState({ seed: 2, hazards: [{ segment: 0, lane: 0, impactAt: 0.92 }] });

    state = step(state, 1_000, { flip: true });

    expect(state).toMatchObject({ failed: false, closeCalls: 1, bonus: 1 });
  });
});
