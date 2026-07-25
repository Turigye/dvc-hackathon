export type SwitchbackHazard = {
  segment: number;
  lane: 0 | 1;
  impactAt: number;
  resolved?: boolean;
};

export type SwitchbackState = {
  seed: number;
  segment: number;
  progress: number;
  lane: 0 | 1;
  flipped: boolean;
  speed: number;
  score: number;
  bonus: number;
  closeCalls: number;
  hazards: SwitchbackHazard[];
  failed: boolean;
  failure: "missed-vertex" | "hazard" | null;
};

export type SwitchbackInput = { flip: boolean };

export function createSwitchbackState(options: Partial<Pick<SwitchbackState, "seed" | "hazards">> = {}): SwitchbackState {
  return {
    seed: options.seed ?? 1,
    segment: 0,
    progress: 0,
    lane: 0,
    flipped: false,
    // The first corner is deliberately generous: the player must have time to
    // see the runner move, understand the upcoming turn, and make one choice.
    speed: 1 / 1_600,
    score: 0,
    bonus: 0,
    closeCalls: 0,
    hazards: options.hazards?.map((hazard) => ({ ...hazard })) ?? [],
    failed: false,
    failure: null,
  };
}

/** A pure, frame-rate-independent Switchback simulation. */
export function step(previous: SwitchbackState, dtMs: number, input: SwitchbackInput): SwitchbackState {
  const state: SwitchbackState = { ...previous, hazards: previous.hazards.map((hazard) => ({ ...hazard })) };
  if (state.failed || dtMs <= 0) return applyInput(state, input);

  applyInput(state, input);
  let remaining = dtMs;
  while (remaining > 0 && !state.failed) {
    const slice = Math.min(64, remaining);
    advance(state, slice);
    remaining -= slice;
  }
  return state;
}

function applyInput(state: SwitchbackState, input: SwitchbackInput) {
  if (!input.flip) return state;
  state.lane = state.lane === 0 ? 1 : 0;
  state.flipped = true;
  return state;
}

function advance(state: SwitchbackState, dtMs: number) {
  const from = state.progress;
  state.progress += state.speed * dtMs;

  for (const hazard of state.hazards) {
    if (hazard.resolved || hazard.segment !== state.segment || from > hazard.impactAt || state.progress < hazard.impactAt) continue;
    hazard.resolved = true;
    if (hazard.lane === state.lane) {
      state.failed = true;
      state.failure = "hazard";
      return;
    }
    state.closeCalls += 1;
    state.bonus += 1;
  }

  if (state.progress < 1) return;
  if (!state.flipped) {
    state.failed = true;
    state.failure = "missed-vertex";
    state.progress = 1;
    return;
  }

  state.progress -= 1;
  state.segment += 1;
  state.score += 1;
  state.flipped = false;
  state.speed = Math.min(1 / 420, state.speed * 1.045);
}
