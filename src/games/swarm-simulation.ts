export type SwarmKind = "prey" | "predator" | "queen";
export type SwarmBug = {
  id: number; kind: SwarmKind; x: number; y: number; vx: number; vy: number; r: number;
  health?: number; invulnerableMs?: number;
};
export type SwarmFailure = "predator" | "escaped" | null;
export type SwarmEvent = "prey" | "predator" | "escape" | "queen-spawn" | "queen-hit" | "queen-defeat" | null;
export type SwarmState = {
  seed: number; bugs: SwarmBug[]; score: number; lives: number; bloom: number; bosses: number;
  nextSpawnMs: number; nextId: number; spawnEnabled: boolean; failed: boolean; failure: SwarmFailure;
  event: SwarmEvent; eventNonce: number;
};

type Options = Partial<Pick<SwarmState, "seed" | "bugs" | "score" | "lives" | "bloom" | "bosses" | "spawnEnabled">>;

export function createSwarmState(options: Options = {}): SwarmState {
  return {
    seed: options.seed ?? 1, bugs: options.bugs?.map((target) => ({ ...target })) ?? [], score: options.score ?? 0,
    lives: options.lives ?? 3, bloom: options.bloom ?? 0, bosses: options.bosses ?? 0, nextSpawnMs: 0,
    nextId: Math.max(0, ...(options.bugs ?? []).map((target) => target.id)) + 1, spawnEnabled: options.spawnEnabled ?? true,
    failed: false, failure: null, event: null, eventNonce: 0,
  };
}

function random(state: SwarmState) {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return state.seed / 0x1_0000_0000;
}
const emit = (state: SwarmState, event: SwarmEvent) => { state.event = event; state.eventNonce += 1; };

function summonQueen(state: SwarmState) {
  if (state.bugs.some((target) => target.kind === "queen")) return;
  state.bugs.push({ id: state.nextId++, kind: "queen", x: 50, y: 42, vx: 7, vy: 5, r: 11, health: 3, invulnerableMs: 0 });
  emit(state, "queen-spawn");
}

function spawnTarget(state: SwarmState) {
  const predatorChance = Math.min(0.24, 0.06 + state.score / 1800 + state.bosses * 0.02);
  const kind: SwarmKind = random(state) < predatorChance ? "predator" : "prey";
  const fromLeft = random(state) < 0.5;
  const speed = 10 + random(state) * 7 + Math.min(8, state.score / 250);
  const x = fromLeft ? 7 : 93;
  let y = 18 + random(state) * 58;
  const r = kind === "predator" ? 9.2 : 8.2;
  // Reject crowded spawn points so two different rules never occupy one tap.
  for (let attempt = 0; attempt < 7; attempt++) {
    const crowded = state.bugs.some((target) => Math.hypot(target.x - x, (target.y - y) * 2.16) < target.r + r + 3);
    if (!crowded) break;
    y = 18 + random(state) * 58;
  }
  state.bugs.push({ id: state.nextId++, kind, x, y, vx: fromLeft ? speed : -speed, vy: (random(state) - 0.5) * 7, r });
}

export function stepSwarm(previous: SwarmState, dtMs: number): SwarmState {
  const state: SwarmState = { ...previous, bugs: previous.bugs.map((target) => ({ ...target })), event: null };
  if (state.failed || dtMs <= 0) return state;
  const dt = Math.min(120, dtMs) / 1000;
  state.nextSpawnMs -= dtMs;
  if (state.spawnEnabled && state.nextSpawnMs <= 0 && !state.bugs.some((target) => target.kind === "queen")) {
    spawnTarget(state);
    state.nextSpawnMs = Math.max(460, 980 - state.score * 0.75);
  }
  const kept: SwarmBug[] = [];
  for (const target of state.bugs) {
    target.invulnerableMs = Math.max(0, (target.invulnerableMs ?? 0) - dtMs);
    target.x += target.vx * dt;
    target.y += target.vy * dt;
    if (target.kind === "queen") {
      if (target.x < 20 || target.x > 80) { target.vx *= -1; target.x = Math.max(20, Math.min(80, target.x)); }
      if (target.y < 20 || target.y > 72) { target.vy *= -1; target.y = Math.max(20, Math.min(72, target.y)); }
      kept.push(target); continue;
    }
    target.y = Math.max(12, Math.min(82, target.y));
    if (target.x >= -14 && target.x <= 114) { kept.push(target); continue; }
    if (target.kind === "prey") {
      state.lives -= 1; emit(state, "escape");
      if (state.lives <= 0) { state.failed = true; state.failure = "escaped"; }
    }
  }
  state.bugs = kept;
  return state;
}

export function tapSwarm(previous: SwarmState, x: number, y: number, aspect = 844 / 390): SwarmState {
  const state: SwarmState = { ...previous, bugs: previous.bugs.map((target) => ({ ...target })), event: null };
  if (state.failed) return state;
  const candidates = state.bugs.map((target) => ({
    target, distance: Math.hypot(target.x - x, (target.y - y) * aspect),
  })).filter(({ target, distance }) => distance <= target.r)
    .sort((a, b) => (a.distance / a.target.r) - (b.distance / b.target.r) || b.target.id - a.target.id);
  const hit = candidates[0]?.target;
  if (!hit) return state;
  if (hit.kind === "predator") { state.failed = true; state.failure = "predator"; emit(state, "predator"); return state; }
  if (hit.kind === "queen") {
    if ((hit.invulnerableMs ?? 0) > 0) return state;
    hit.health = (hit.health ?? 3) - 1;
    state.score += 20;
    if (hit.health > 0) {
      hit.invulnerableMs = 600;
      hit.x = 24 + random(state) * 52; hit.y = 24 + random(state) * 42;
      emit(state, "queen-hit");
    } else {
      state.bugs = state.bugs.filter((target) => target.id !== hit.id && target.kind !== "predator");
      state.score += 100; state.lives = Math.min(3, state.lives + 1); state.bloom = 0; state.bosses += 1;
      emit(state, "queen-defeat");
    }
    return state;
  }
  state.bugs = state.bugs.filter((target) => target.id !== hit.id);
  state.score += 10; state.bloom = Math.min(5, state.bloom + 1); emit(state, "prey");
  if (state.bloom === 5) summonQueen(state);
  return state;
}
