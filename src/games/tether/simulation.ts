/**
 * TETHER — pure simulation.
 *
 * You orbit an anchor. Tap releases you along the tangent; you arc under gravity
 * and latch onto the next anchor you pass near enough to. Miss, and you fall.
 *
 * The whole game is one decision made repeatedly: *when* to let go. Release
 * early and you undershoot; late and you sail past. The tangent does the rest.
 *
 * No rendering, no timers, no rAF. Deterministic for a given seed.
 */

export type Vec2 = { x: number; y: number };

export type Anchor = {
  id: number;
  x: number;
  y: number;
  /** Decorative depth. Never affects physics — it only drives parallax. */
  z: number;
  kind: "solid" | "decay" | "drift";
  /** Decay anchors dissolve this many seconds after first capture. */
  life?: number;
  driftPhase?: number;
  captured?: boolean;
};

export type Phase = "orbiting" | "flying" | "falling";

export type TetherState = {
  seed: number;
  phase: Phase;
  /** Which anchor we are bound to, or last released from. */
  anchorId: number;
  /** Orbit angle in radians. Position is derived, never stored twice. */
  angle: number;
  spin: number;
  pos: Vec2;
  vel: Vec2;
  anchors: Anchor[];
  height: number;
  score: number;
  combo: number;
  bestCombo: number;
  perfects: number;
  /** 0..1 quality of the last latch. Drives the burst and the multiplier. */
  lastLatch: number;
  event: "release" | "latch" | "perfect" | "decay" | "dead" | null;
  eventNonce: number;
  failed: boolean;
  elapsedMs: number;
};

export const ORBIT_RADIUS = 1.12;
export const CAPTURE_RADIUS = 0.5;
const BASE_SPIN = 2.5;
const MAX_SPIN = 4.6;
const LAUNCH_SPEED = 8.2;
const GRAVITY = 9.2;
/** How far below the current anchor you may fall before the run ends. */
const FALL_MARGIN = 6.5;
const PERFECT_WINDOW = 0.17;
const LOOKAHEAD = 6;

export function createTetherState(seed = 1): TetherState {
  const state: TetherState = {
    seed: seed >>> 0 || 1,
    phase: "orbiting",
    anchorId: 1,
    angle: -Math.PI / 2,
    spin: BASE_SPIN,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    anchors: [{ id: 1, x: 0, y: 0, z: 0, kind: "solid" }],
    height: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    perfects: 0,
    lastLatch: 0,
    event: null,
    eventNonce: 0,
    failed: false,
    elapsedMs: 0,
  };
  extend(state);
  state.pos = orbitPoint(state);
  return state;
}

function random(state: TetherState) {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return state.seed / 0x1_0000_0000;
}

export const anchorById = (state: TetherState, id: number) => state.anchors.find((a) => a.id === id);

/** Where the orb sits right now, given its anchor and angle. */
export function orbitPoint(state: TetherState): Vec2 {
  const anchor = anchorById(state, state.anchorId);
  if (!anchor) return state.pos;
  return {
    x: anchor.x + Math.cos(state.angle) * ORBIT_RADIUS,
    y: anchor.y + Math.sin(state.angle) * ORBIT_RADIUS,
  };
}

/** Tangent of the orbit — the direction you leave on. */
export function tangent(state: TetherState): Vec2 {
  return { x: -Math.sin(state.angle), y: Math.cos(state.angle) };
}

/**
 * Anchors are generated so every one is reachable from *some* release angle.
 * Vertical rise stays inside the ballistic apex and horizontal reach inside the
 * 45-degree range, with headroom, so no gap is ever impossible.
 */
const APEX = (LAUNCH_SPEED * LAUNCH_SPEED) / (2 * GRAVITY);
/** Centre-to-centre spacing. Below 2 orbit radii the rings touch and the arc is
 *  skippable; above the ballistic reach the jump is impossible. */
const MIN_GAP = ORBIT_RADIUS * 2 + 0.85;
const MAX_GAP = APEX + ORBIT_RADIUS * 0.6;

function extend(state: TetherState) {
  while (state.anchors.length < LOOKAHEAD) {
    const last = state.anchors[state.anchors.length - 1];
    // Depth is the anchor's own id. Using the array length pinned this to 5 after
    // the first prune, which froze difficulty and stopped drift/decay ever spawning.
    const depth = last.id;
    const difficulty = Math.min(1, depth / 40);
    const spread = 1.2 + difficulty * 1.4;
    let dx = (random(state) * 2 - 1) * spread;
    let rise = MIN_GAP * 0.72 + difficulty * 0.7 + random(state) * 0.6;
    // Rings must never overlap, or the next orbit is already touching this one.
    let gap = Math.hypot(dx, rise);
    if (gap < MIN_GAP) { const k = MIN_GAP / (gap || 1); dx *= k; rise *= k; gap = MIN_GAP; }
    if (gap > MAX_GAP) { const k = MAX_GAP / gap; dx *= k; rise *= k; }
    // Clamp x first, then re-derive the gap — clamping afterwards silently shrank
    // it back under the minimum and let rings touch again.
    const x = Math.max(-2.4, Math.min(2.4, last.x + dx));
    dx = x - last.x;
    const realGap = Math.hypot(dx, rise);
    if (realGap < MIN_GAP) rise = Math.sqrt(Math.max(0, MIN_GAP * MIN_GAP - dx * dx));
    const roll = random(state);
    const kind: Anchor["kind"] = depth < 5 ? "solid" : roll < 0.18 ? "decay" : roll < 0.42 ? "drift" : "solid";
    state.anchors.push({
      id: last.id + 1,
      x,
      y: last.y + rise,
      z: (random(state) * 2 - 1) * 0.8,
      kind,
      life: kind === "decay" ? 1.5 : undefined,
      driftPhase: kind === "drift" ? random(state) * Math.PI * 2 : undefined,
    });
  }
}

/** Drift anchors sway horizontally. Pure function of time so it stays testable. */
export function anchorPosition(anchor: Anchor, elapsedMs: number): Vec2 {
  if (anchor.kind !== "drift" || anchor.driftPhase === undefined) return { x: anchor.x, y: anchor.y };
  return { x: anchor.x + Math.sin(elapsedMs / 900 + anchor.driftPhase) * 0.7, y: anchor.y };
}

/** The capture band narrows as you climb, so late hops demand real precision. */
export function captureTolerance(depth: number) {
  return CAPTURE_RADIUS * (1 - Math.min(0.5, depth / 90));
}

export type TetherInput = { release: boolean };

export function step(previous: TetherState, dtMs: number, input: TetherInput): TetherState {
  const state: TetherState = {
    ...previous,
    pos: { ...previous.pos },
    vel: { ...previous.vel },
    anchors: previous.anchors.map((a) => ({ ...a })),
    event: null,
  };
  if (state.failed) return state;

  const dt = Math.min(dtMs, 48) / 1000;
  state.elapsedMs += dtMs;

  if (state.phase === "orbiting") {
    const anchor = anchorById(state, state.anchorId);
    if (anchor?.kind === "decay") {
      anchor.life = (anchor.life ?? 1.5) - dt;
      if (anchor.life <= 0) {
        // The pad dissolves beneath you: you are launched, ready or not.
        release(state);
        emit(state, "decay");
        return state;
      }
    }
    // Release is resolved on the angle the player actually saw, before the frame
    // advances. Acting on the post-integration angle makes taps feel a frame late.
    if (input.release) {
      release(state);
      emit(state, "release");
      return state;
    }
    state.angle += state.spin * dt;
    state.pos = orbitPoint(state);
    return state;
  }

  // Ballistic flight.
  state.vel.y -= GRAVITY * dt;
  state.pos.x += state.vel.x * dt;
  state.pos.y += state.vel.y * dt;

  const current = anchorById(state, state.anchorId);
  let best: { anchor: Anchor; distance: number; ringError: number } | null = null;
  for (const anchor of state.anchors) {
    if (anchor.id <= state.anchorId) continue;
    const at = anchorPosition(anchor, state.elapsedMs);
    const distance = Math.hypot(at.x - state.pos.x, at.y - state.pos.y);
    // You must arrive ON the ring, not merely inside it.
    const ringError = Math.abs(distance - ORBIT_RADIUS);
    if (ringError <= captureTolerance(state.anchorId) && (!best || ringError < best.ringError)) {
      best = { anchor, distance, ringError };
    }
  }

  if (best) {
    latch(state, best.anchor, best.distance);
    return state;
  }

  if (current && state.pos.y < current.y - FALL_MARGIN) {
    state.phase = "falling";
    state.failed = true;
    state.combo = 0;
    emit(state, "dead");
  }
  return state;
}

function release(state: TetherState) {
  const direction = tangent(state);
  state.vel = { x: direction.x * LAUNCH_SPEED, y: direction.y * LAUNCH_SPEED };
  state.phase = "flying";
}

function latch(state: TetherState, anchor: Anchor, distance: number) {
  const at = anchorPosition(anchor, state.elapsedMs);
  // Latch quality: how close to the ideal orbit radius you arrived. Threading it
  // exactly is worth far more than scraping in at the edge of the capture ring.
  const error = Math.abs(distance - ORBIT_RADIUS);
  const quality = Math.max(0, 1 - error / (CAPTURE_RADIUS * 0.9));
  const perfect = error < PERFECT_WINDOW * (1 + Math.min(1, anchor.id / 90));

  state.anchorId = anchor.id;
  state.angle = Math.atan2(state.pos.y - at.y, state.pos.x - at.x);
  state.phase = "orbiting";
  state.pos = orbitPoint(state);
  state.vel = { x: 0, y: 0 };
  state.lastLatch = quality;
  anchor.captured = true;

  state.combo = perfect ? state.combo + 1 : 0;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  if (perfect) state.perfects += 1;
  state.score += 10 + Math.round(quality * 10) + (perfect ? 15 * Math.min(6, state.combo) : 0);
  state.height = Math.max(state.height, anchor.y);
  state.spin = Math.min(MAX_SPIN, BASE_SPIN + anchor.id * 0.045);

  state.anchors = state.anchors.filter((a) => a.id >= anchor.id - 2);
  extend(state);
  emit(state, perfect ? "perfect" : "latch");
}

function emit(state: TetherState, event: TetherState["event"]) {
  state.event = event;
  state.eventNonce += 1;
}

/** Every gap must be clearable from at least one release angle. Used by tests. */
export function gapIsReachable(from: Anchor, to: Anchor) {
  return gapDistance(from, to) <= MAX_GAP + CAPTURE_RADIUS;
}

/** Centre-to-centre distance. Exported so tests can assert rings never overlap. */
export function gapDistance(from: Anchor, to: Anchor) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export const SPACING = { MIN_GAP, MAX_GAP, APEX };
