/**
 * Switchback — pure simulation.
 *
 * The ribbon is the play space. The runner travels a zigzag of segments and
 * hugs one of two rails. Crossing a vertex folds the ribbon back, so the
 * runner's rail is inverted automatically: the same tap means different things
 * depending on where you are in the zigzag. That is the whole game.
 *
 * No rendering, no timers, no rAF. `step` is deterministic given a seed.
 */

export type Rail = 0 | 1;
export type HazardKind = "piston" | "spikes" | "sweeper";
export type PickupKind = "coin" | "shield" | "boost";

/** A non-lethal slow band. Running through it drags you and lets the pursuer gain. */
export type Drag = { id: number; segment: number; rail: Rail; from: number; to: number };

export type Hazard = {
  id: number;
  kind: HazardKind;
  segment: number;
  rail: Rail;
  /** Lethal window along the segment, 0..1. */
  from: number;
  to: number;
  /** Sweepers move to the opposite rail after `switchAt`. */
  switchAt?: number;
  scored?: boolean;
};

export type Pickup = {
  id: number;
  kind: PickupKind;
  segment: number;
  rail: Rail;
  at: number;
  taken?: boolean;
};

export type SwitchbackState = {
  seed: number;
  /** Distance travelled, measured in segments. Integer part is the segment. */
  progress: number;
  rail: Rail;
  speed: number;
  score: number;
  combo: number;
  bestCombo: number;
  coins: number;
  shield: number;
  boostMs: number;
  hazards: Hazard[];
  pickups: Pickup[];
  drags: Drag[];
  spawnedThrough: number;
  nextId: number;
  event: "near-miss" | "coin" | "shield" | "boost" | "blocked" | "vertex" | "chaser" | "drag" | null;
  eventNonce: number;
  failed: boolean;
  failure: "hazard" | "caught" | null;
  spawnEnabled: boolean;
  /**
   * Distance the pursuer trails the runner, in segments. It closes on its own,
   * and is pushed back by risk — near misses, coins, boosts. Playing safe is
   * therefore the losing strategy.
   */
  chaseGap: number;
  chaserActive: boolean;
};

export type SwitchbackInput = { flip: boolean };

/** Segments visible ahead of the runner. Also the spawn horizon. */
export const LOOKAHEAD = 4;
const BASE_SPEED = 0.5;
const MAX_SPEED = 1.12;
const BOOST_MULTIPLIER = 1.35;
/** Nothing lethal may appear with less warning than this. */
export const MIN_TELEGRAPH_MS = 450;
const NEAR_MISS_WINDOW = 0.12;

/** The pursuer wakes once the player has found their footing. */
const CHASER_WAKES_AT = 6;
const CHASER_START_GAP = 1.8;
const CHASER_MAX_GAP = 2.15;
/** Segments per second the gap closes on its own, before risk pushes it back. */
const CHASER_CLOSE_BASE = 0.03;
const PUSHBACK = { "near-miss": 0.3, coin: 0.18, boost: 0.62 } as const;
/** While dragging, you crawl and the pursuer closes far faster. This is the jeopardy. */
const DRAG_SPEED = 0.55;
const DRAG_CHASE_MULTIPLIER = 4.5;

type Options = Partial<Pick<SwitchbackState, "seed" | "rail" | "speed" | "hazards" | "pickups" | "spawnEnabled" | "shield" | "chaseGap" | "chaserActive" | "drags">>;

export function createSwitchbackState(options: Options = {}): SwitchbackState {
  const state: SwitchbackState = {
    seed: options.seed ?? 1,
    progress: 0,
    rail: options.rail ?? 0,
    speed: options.speed ?? BASE_SPEED,
    score: 0,
    combo: 0,
    bestCombo: 0,
    coins: 0,
    shield: options.shield ?? 0,
    boostMs: 0,
    hazards: options.hazards?.map((hazard) => ({ ...hazard })) ?? [],
    pickups: options.pickups?.map((pickup) => ({ ...pickup })) ?? [],
    drags: options.drags?.map((drag) => ({ ...drag })) ?? [],
    spawnedThrough: 0,
    nextId: 1,
    event: null,
    eventNonce: 0,
    failed: false,
    failure: null,
    spawnEnabled: options.spawnEnabled ?? true,
    chaseGap: options.chaseGap ?? CHASER_START_GAP,
    chaserActive: options.chaserActive ?? false,
  };
  if (state.spawnEnabled && !options.hazards) spawnAhead(state);
  return state;
}

function random(state: SwitchbackState) {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return state.seed / 0x1_0000_0000;
}

const other = (rail: Rail): Rail => (rail === 0 ? 1 : 0);

/** Segment index the runner is on. */
export const segmentOf = (progress: number) => Math.floor(progress);
/** Position along the current segment, 0..1. */
export const offsetOf = (progress: number) => progress - Math.floor(progress);

/** True while `at` falls inside the hazard's lethal window on `rail`. */
export function hazardCovers(hazard: Hazard, rail: Rail, at: number) {
  if (at < hazard.from || at > hazard.to) return false;
  if (hazard.kind === "sweeper" && hazard.switchAt !== undefined) {
    return at < hazard.switchAt ? rail === hazard.rail : rail === other(hazard.rail);
  }
  return rail === hazard.rail;
}

/**
 * Difficulty gate. Types unlock with score so a new player meets one idea at a
 * time, and the ramp has somewhere to go.
 */
function pickKind(state: SwitchbackState, roll: number): HazardKind {
  if (state.score < 10) return "piston";
  if (state.score < 25) return roll < 0.62 ? "piston" : "spikes";
  return roll < 0.44 ? "piston" : roll < 0.76 ? "spikes" : "sweeper";
}

function spawnSegment(state: SwitchbackState, segment: number) {
  const density = Math.min(0.92, 0.5 + segmentOf(state.progress) / 260);
  if (random(state) > density) return; // Dead air. Intensity needs troughs.

  const kind = pickKind(state, random(state));
  const rail: Rail = random(state) < 0.5 ? 0 : 1;
  const id = state.nextId++;

  if (kind === "spikes") {
    const from = 0.18 + random(state) * 0.3;
    state.hazards.push({ id, kind, segment, rail, from, to: Math.min(0.92, from + 0.26 + random(state) * 0.16) });
  } else if (kind === "sweeper") {
    const from = 0.22 + random(state) * 0.28;
    const to = Math.min(0.94, from + 0.34);
    state.hazards.push({ id, kind, segment, rail, from, to, switchAt: from + (to - from) / 2 });
  } else {
    const at = 0.2 + random(state) * 0.58;
    state.hazards.push({ id, kind, segment, rail, from: at, to: at + 0.09 });
  }

  // Rewards sit where the risk is: same rail as the hazard, just past it.
  const hazard = state.hazards[state.hazards.length - 1];
  const roll = random(state);
  const kindPick: PickupKind = roll < 0.14 ? "shield" : roll < 0.26 ? "boost" : "coin";
  // The reward sits on the risky rail, but far enough past the hazard that the
  // player can flip back onto it. Below ~0.16 the dodge and the pickup are the
  // same instant and the reward is unreachable by construction.
  const after = hazard.to + 0.2;
  if (after <= 0.9) {
    // Room to flip back onto the risky rail once the hazard has passed.
    state.pickups.push({ id: state.nextId++, kind: kindPick, segment, rail: hazard.rail, at: after });
  } else if (hazard.from >= 0.4) {
    // No room after it — offer the reward before the hazard, on the rail the
    // player must leave. Taking it means committing late to the dodge.
    state.pickups.push({ id: state.nextId++, kind: kindPick, segment, rail: hazard.rail, at: hazard.from - 0.22 });
  } else {
    // Hazard fills the segment: put the reward on the open rail, clear of it.
    state.pickups.push({ id: state.nextId++, kind: kindPick, segment, rail: other(hazard.rail), at: Math.min(0.9, hazard.to + 0.06) });
  }

  // Sometimes the open rail carries a drag band: surviving is still possible,
  // but taking the lazy line costs you ground against the pursuer.
  if (segment > 3 && random(state) < 0.34) {
    const from = 0.2 + random(state) * 0.42;
    state.drags.push({ id: state.nextId++, segment, rail: other(hazard.rail), from, to: Math.min(0.95, from + 0.24) });
  }

  // A second hazard may never close the last open rail at the same point on
  // the segment — it is placed strictly after the first one clears.
  if (state.score > 40 && random(state) < 0.3) {
    const gapStart = Math.min(0.95, hazard.to + 0.34);
    if (gapStart < 0.82) {
      const at2 = gapStart + random(state) * (0.95 - gapStart);
      state.hazards.push({ id: state.nextId++, kind: "piston", segment, rail: other(hazard.rail), from: at2, to: at2 + 0.09 });
    }
  }
}

function spawnAhead(state: SwitchbackState) {
  if (!state.spawnEnabled) return;
  const horizon = segmentOf(state.progress) + LOOKAHEAD;
  while (state.spawnedThrough < horizon) {
    state.spawnedThrough += 1;
    spawnSegment(state, state.spawnedThrough);
  }
}

/** Risk buys distance from the pursuer. */
function pushBack(state: SwitchbackState, segments: number) {
  if (!state.chaserActive) return;
  state.chaseGap = Math.min(CHASER_MAX_GAP, state.chaseGap + segments);
}

/** How fast the pursuer closes, in segments per second, at the current score. */
export function chaserCloseRate(score: number) {
  return CHASER_CLOSE_BASE + Math.min(0.045, score / 4200);
}

function emit(state: SwitchbackState, event: SwitchbackState["event"]) {
  state.event = event;
  state.eventNonce += 1;
}

/**
 * Advance the world by `dtMs`. Movement is integrated in small slices so a
 * slow frame cannot tunnel the runner through a hazard.
 */
export function step(previous: SwitchbackState, dtMs: number, input: SwitchbackInput): SwitchbackState {
  const state: SwitchbackState = {
    ...previous,
    hazards: previous.hazards.map((hazard) => ({ ...hazard })),
    pickups: previous.pickups.map((pickup) => ({ ...pickup })),
    event: null,
  };

  if (input.flip && !state.failed) state.rail = other(state.rail);
  if (state.failed || dtMs <= 0) return state;

  const boosting = state.boostMs > 0;
  state.boostMs = Math.max(0, state.boostMs - dtMs);
  const speed = state.speed * (boosting ? BOOST_MULTIPLIER : 1);

  let remaining = Math.min(dtMs, 120);
  const sliceMs = 8;

  while (remaining > 0 && !state.failed) {
    const slice = Math.min(sliceMs, remaining);
    remaining -= slice;
    const before = state.progress;
    const slowed = state.drags.some((drag) => drag.segment === segmentOf(before) && drag.rail === state.rail
      && offsetOf(before) >= drag.from && offsetOf(before) <= drag.to);
    state.progress += (speed * (slowed ? DRAG_SPEED : 1) * slice) / 1000;

    // Vertex crossed: the ribbon folds, so the runner's rail inverts.
    if (segmentOf(state.progress) !== segmentOf(before)) {
      state.rail = other(state.rail);
      state.score += 1;
      state.speed = Math.min(MAX_SPEED, BASE_SPEED + segmentOf(state.progress) * 0.0075);
      emit(state, "vertex");
      spawnAhead(state);
    }

    if (!state.chaserActive && state.score >= CHASER_WAKES_AT) {
      state.chaserActive = true;
      state.chaseGap = CHASER_START_GAP;
      emit(state, "chaser");
    }
    const dragging = state.drags.some((drag) => drag.segment === segmentOf(state.progress) && drag.rail === state.rail
      && offsetOf(state.progress) >= drag.from && offsetOf(state.progress) <= drag.to);
    if (dragging && state.event !== "drag") emit(state, "drag");
    if (state.chaserActive) {
      state.chaseGap -= (chaserCloseRate(state.score) * (dragging ? DRAG_CHASE_MULTIPLIER : 1) * slice) / 1000;
      if (state.chaseGap <= 0) {
        state.failed = true;
        state.failure = "caught";
        state.combo = 0;
        break;
      }
    }

    const segment = segmentOf(state.progress);
    const at = offsetOf(state.progress);

    for (const hazard of state.hazards) {
      if (hazard.segment !== segment) continue;
      if (hazardCovers(hazard, state.rail, at)) {
        if (state.shield > 0) {
          state.shield -= 1;
          hazard.scored = true;
          hazard.from = 2; // consumed — cannot re-trigger
          emit(state, "blocked");
        } else {
          state.failed = true;
          state.failure = "hazard";
          state.combo = 0;
        }
        break;
      }
      // Near miss: cleared on the opposite rail, close enough to feel it.
      if (!hazard.scored && at > hazard.to && at - hazard.to < NEAR_MISS_WINDOW) {
        hazard.scored = true;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        state.score += 2 * Math.min(5, state.combo);
        pushBack(state, PUSHBACK["near-miss"]);
        emit(state, "near-miss");
      }
    }

    for (const pickup of state.pickups) {
      if (pickup.taken || pickup.segment !== segment) continue;
      if (pickup.rail !== state.rail || Math.abs(at - pickup.at) > 0.085) continue;
      pickup.taken = true;
      if (pickup.kind === "coin") { state.coins += 1; state.score += 5; pushBack(state, PUSHBACK.coin); emit(state, "coin"); }
      if (pickup.kind === "shield") { state.shield = Math.min(3, state.shield + 1); emit(state, "shield"); }
      if (pickup.kind === "boost") { state.boostMs = 2600; pushBack(state, PUSHBACK.boost); emit(state, "boost"); }
    }
  }

  const cutoff = segmentOf(state.progress) - 1;
  state.hazards = state.hazards.filter((hazard) => hazard.segment >= cutoff);
  state.pickups = state.pickups.filter((pickup) => pickup.segment >= cutoff);
  state.drags = state.drags.filter((drag) => drag.segment >= cutoff);
  return state;
}

/** No hazard may begin before this point on a segment — the runner needs room
 *  to read the fold it just came through. */
export const MIN_HAZARD_START = 0.15;

/**
 * Fairness audit used by tests: at every sampled point of a segment at least
 * one rail must be survivable, and no hazard may sit right on top of a vertex.
 *
 * Telegraph time is a separate, structural guarantee: hazards are spawned
 * `LOOKAHEAD` segments ahead, so the player sees them at least
 * `(LOOKAHEAD - 1) / MAX_SPEED` seconds out. See `worstCaseTelegraphMs`.
 */
export function auditSegment(hazards: Hazard[]) {
  for (let at = 0; at <= 1.0001; at += 0.01) {
    const blocked = ([0, 1] as Rail[]).filter((rail) => hazards.some((hazard) => hazardCovers(hazard, rail, at)));
    if (blocked.length > 1) return { fair: false, reason: "both rails lethal", at };
  }
  for (const hazard of hazards) {
    if (hazard.from < MIN_HAZARD_START) return { fair: false, reason: "hazard too close to the vertex", at: hazard.from };
  }
  return { fair: true, reason: null, at: null };
}

/** Warning the player gets on the worst possible frame, in milliseconds. */
export const worstCaseTelegraphMs = () => ((LOOKAHEAD - 1) / MAX_SPEED) * 1000;
