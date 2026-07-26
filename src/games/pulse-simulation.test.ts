import { describe, expect, test } from "vitest";
import {
  PLAYER_X,
  createPulseState,
  stepPulse,
  type PulseBeat,
} from "./pulse-simulation";

const beat = (phase: 0 | 1, x = PLAYER_X + 0.2): PulseBeat => ({
  id: 1,
  x,
  phase,
  kind: "charge",
  resolved: false,
});

describe("Pulse twin-signal simulation", () => {
  test("the opening sequence teaches swap timing with a fixed 1 → 0 → 1 pattern", () => {
    let state = createPulseState({ seed: 99, activePhase: 1 });
    const phases: Array<0 | 1> = [];
    let highestId = 0;

    for (let frame = 0; frame < 900 && phases.length < 3; frame++) {
      for (const incoming of state.beats) {
        if (incoming.id > highestId) {
          phases.push(incoming.phase);
          highestId = incoming.id;
        }
      }
      const nextPhase = state.beats.find((incoming) => !incoming.resolved && incoming.x <= PLAYER_X + 1)?.phase;
      state = stepPulse(state, 16, { swap: nextPhase !== undefined && nextPhase !== state.activePhase });
    }

    expect(phases.slice(0, 3)).toEqual([1, 0, 1]);
    expect(state.failed).toBe(false);
  });

  test("a tap swaps which signal is material without changing its flight path", () => {
    const state = createPulseState({ spawnEnabled: false, activePhase: 0 });
    const next = stepPulse(state, 16, { swap: true });

    expect(next.activePhase).toBe(1);
    expect(next.event).toBe("swap");
    expect(next.failed).toBe(false);
  });

  test("matching an incoming charge scores while the ghost phase breaks", () => {
    const matching = stepPulse(createPulseState({ spawnEnabled: false, activePhase: 0, beats: [beat(0)] }), 20, { swap: false });
    const wrong = stepPulse(createPulseState({ spawnEnabled: false, activePhase: 1, beats: [beat(0)] }), 20, { swap: false });

    expect(matching.score).toBeGreaterThan(0);
    expect(matching.failed).toBe(false);
    expect(matching.event).toBe("charge");
    expect(wrong.failed).toBe(true);
    expect(wrong.failure).toBe("phase-break");
  });

  test("gold sync beats accept either phase and award a larger pulse", () => {
    const sync: PulseBeat = { ...beat(0), kind: "sync" };
    const result = stepPulse(createPulseState({ spawnEnabled: false, activePhase: 1, beats: [sync] }), 20, { swap: false });

    expect(result.failed).toBe(false);
    expect(result.score).toBe(20);
    expect(result.event).toBe("sync");
  });

  test("generated beat streams are deterministic and preserve a mobile reaction window", () => {
    let a = createPulseState({ seed: 42 });
    let b = createPulseState({ seed: 42 });
    for (let index = 0; index < 900; index++) {
      a = stepPulse(a, 16, { swap: false });
      b = stepPulse(b, 16, { swap: false });
      expect(a.beats).toEqual(b.beats);
      const ordered = [...a.beats].sort((left, right) => left.x - right.x);
      for (let beatIndex = 1; beatIndex < ordered.length; beatIndex++) {
        const gap = ordered[beatIndex].x - ordered[beatIndex - 1].x;
        expect((gap / a.speed) * 1000).toBeGreaterThanOrEqual(500);
      }
      if (a.failed) break;
    }
  });
});
