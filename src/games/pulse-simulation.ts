export type PulsePhase = 0 | 1;
export type PulseBeat = {
  id: number;
  x: number;
  phase: PulsePhase;
  kind: "charge" | "sync";
  resolved: boolean;
};

export type PulseEvent = "swap" | "charge" | "sync" | "phase-break" | null;

export type PulseState = {
  seed: number;
  elapsedMs: number;
  activePhase: PulsePhase;
  score: number;
  combo: number;
  bestCombo: number;
  speed: number;
  beats: PulseBeat[];
  nextId: number;
  spawnEnabled: boolean;
  failed: boolean;
  failure: "phase-break" | null;
  event: PulseEvent;
  eventNonce: number;
};

export type PulseInput = { swap: boolean };
type PulseOptions = Partial<Pick<PulseState, "seed" | "activePhase" | "score" | "speed" | "beats" | "spawnEnabled">>;

export const PLAYER_X = 18;
export const BASE_SPEED = 25;
export const MAX_SPEED = 48;
export const WAVE_AMPLITUDE = 25;

function other(phase: PulsePhase): PulsePhase {
  return phase === 0 ? 1 : 0;
}

function random(state: PulseState) {
  let value = state.seed | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.seed = value >>> 0;
  return state.seed / 4294967296;
}

function emit(state: PulseState, event: Exclude<PulseEvent, null>) {
  state.event = event;
  state.eventNonce += 1;
}

function spawnBeat(state: PulseState, x: number, forcedPhase?: PulsePhase) {
  const id = state.nextId++;
  const phase = forcedPhase ?? (random(state) < 0.5 ? 0 : 1);
  const kind = state.score >= 30 && random(state) < 0.12 ? "sync" : "charge";
  state.beats.push({ id, x, phase, kind, resolved: false });
  return phase;
}

function spawnAhead(state: PulseState) {
  if (!state.spawnEnabled) return;
  const furthest = state.beats.reduce((max, beat) => Math.max(max, beat.x), -Infinity);
  if (furthest >= 70) return;

  const scriptedPhase: PulsePhase | undefined = state.nextId <= 3 ? (state.nextId % 2) as PulsePhase : undefined;
  const firstPhase = spawnBeat(state, 110, scriptedPhase);
  // Late-game doublets are the twist's pressure test: two readable phase
  // decisions, never closer than a 500ms reaction window at maximum speed.
  if (state.score >= 80 && random(state) < 0.24) spawnBeat(state, 136, other(firstPhase));
}

export function createPulseState(options: PulseOptions = {}): PulseState {
  const state: PulseState = {
    seed: options.seed ?? 1,
    elapsedMs: 0,
    activePhase: options.activePhase ?? 0,
    score: options.score ?? 0,
    combo: 0,
    bestCombo: 0,
    speed: options.speed ?? BASE_SPEED,
    beats: options.beats?.map((beat) => ({ ...beat })) ?? [],
    nextId: (options.beats?.reduce((max, beat) => Math.max(max, beat.id), 0) ?? 0) + 1,
    spawnEnabled: options.spawnEnabled ?? true,
    failed: false,
    failure: null,
    event: null,
    eventNonce: 0,
  };
  spawnAhead(state);
  return state;
}

/** Two signals share one travelling wave and remain exactly half a cycle apart. */
export function signalY(elapsedMs: number, x: number, phase: PulsePhase) {
  const travellingDelay = (x - PLAYER_X) * 24;
  const angle = ((elapsedMs + travellingDelay) / 900) * Math.PI * 2 + phase * Math.PI;
  return 50 + Math.sin(angle) * WAVE_AMPLITUDE;
}

export function stepPulse(previous: PulseState, dtMs: number, input: PulseInput): PulseState {
  const state: PulseState = {
    ...previous,
    beats: previous.beats.map((beat) => ({ ...beat })),
    event: null,
  };
  if (state.failed || dtMs <= 0) return state;

  if (input.swap) {
    state.activePhase = other(state.activePhase);
    emit(state, "swap");
  }

  const dt = Math.min(80, dtMs);
  state.elapsedMs += dt;
  for (const beat of state.beats) beat.x -= (state.speed * dt) / 1000;

  for (const beat of state.beats) {
    if (beat.resolved || beat.x > PLAYER_X) continue;
    beat.resolved = true;
    if (beat.kind !== "sync" && beat.phase !== state.activePhase) {
      state.failed = true;
      state.failure = "phase-break";
      state.combo = 0;
      emit(state, "phase-break");
      break;
    }

    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.score += beat.kind === "sync" ? 20 : 10 * Math.min(4, state.combo);
    state.speed = Math.min(MAX_SPEED, BASE_SPEED + state.score / 80);
    emit(state, beat.kind);
  }

  state.beats = state.beats.filter((beat) => beat.x > -12);
  if (!state.failed) spawnAhead(state);
  return state;
}
