export type Lane = -1 | 0 | 1;
export type RunnerEntityKind = "piston" | "spikes" | "shield" | "boost" | "coin";

export type RunnerEntity = {
  id: number;
  row: number;
  kind: RunnerEntityKind;
  lane: Lane;
  safeLane: Lane;
  /** Normalized vertical position. The runner collision line is 0.72. */
  y: number;
};

export type SwitchbackState = {
  seed: number;
  lane: Lane;
  distance: number;
  speed: number;
  score: number;
  coins: number;
  rowsSpawned: number;
  obstaclesSmashed: number;
  shieldCharges: number;
  boostMs: number;
  entities: RunnerEntity[];
  spawnMeter: number;
  spawnEnabled: boolean;
  lastSafeLane: Lane;
  nextId: number;
  event: "shield" | "boost" | "coin" | "smash" | "shield-hit" | null;
  eventNonce: number;
  failed: boolean;
  failure: "hazard" | null;
};

export type SwitchbackInput = { move: Lane };

type StateOptions = Partial<Pick<
  SwitchbackState,
  "seed" | "lane" | "speed" | "entities" | "shieldCharges" | "boostMs" | "spawnEnabled"
>>;

const LANES: Lane[] = [-1, 0, 1];
const PLAYER_Y = 0.72;
const SPAWN_GAP = 0.3;

export function createSwitchbackState(options: StateOptions = {}): SwitchbackState {
  return {
    seed: options.seed ?? 17,
    lane: options.lane ?? 0,
    distance: 0,
    speed: options.speed ?? 0.00032,
    score: 0,
    coins: 0,
    rowsSpawned: 0,
    obstaclesSmashed: 0,
    shieldCharges: options.shieldCharges ?? 0,
    boostMs: options.boostMs ?? 0,
    entities: options.entities?.map((entity) => ({ ...entity })) ?? [],
    // Spawn a readable first row almost immediately after the run begins.
    spawnMeter: SPAWN_GAP - 0.035,
    spawnEnabled: options.spawnEnabled ?? true,
    lastSafeLane: options.lane ?? 0,
    nextId: (options.entities?.reduce((max, entity) => Math.max(max, entity.id), 0) ?? 0) + 1,
    event: null,
    eventNonce: 0,
    failed: false,
    failure: null,
  };
}

/** Pure, frame-rate-independent endless-runner simulation. */
export function step(previous: SwitchbackState, dtMs: number, input: SwitchbackInput): SwitchbackState {
  const state: SwitchbackState = {
    ...previous,
    entities: previous.entities.map((entity) => ({ ...entity })),
    event: null,
  };

  applyInput(state, input);
  if (state.failed || dtMs <= 0) return state;

  let remaining = dtMs;
  while (remaining > 0 && !state.failed) {
    const slice = Math.min(32, remaining);
    advance(state, slice);
    remaining -= slice;
  }
  return state;
}

function applyInput(state: SwitchbackState, input: SwitchbackInput) {
  if (input.move === 0) return;
  state.lane = clampLane(state.lane + input.move);
}

function advance(state: SwitchbackState, dtMs: number) {
  const distance = state.speed * dtMs;
  state.distance += distance;
  state.speed = Math.min(0.00058, 0.00032 + state.distance * 0.000006);
  state.boostMs = Math.max(0, state.boostMs - dtMs);

  const priorY = new Map(state.entities.map((entity) => [entity.id, entity.y]));
  for (const entity of state.entities) entity.y += distance;

  if (state.spawnEnabled) {
    state.spawnMeter += distance;
    while (state.spawnMeter >= SPAWN_GAP) {
      state.spawnMeter -= SPAWN_GAP;
      spawnRow(state);
    }
  }

  const remove = new Set<number>();
  for (const entity of state.entities) {
    const before = priorY.get(entity.id) ?? entity.y;
    if (before >= PLAYER_Y || entity.y < PLAYER_Y || entity.lane !== state.lane) continue;

    if (entity.kind === "shield") {
      state.shieldCharges = Math.min(2, state.shieldCharges + 1);
      markEvent(state, "shield");
      remove.add(entity.id);
      continue;
    }
    if (entity.kind === "boost") {
      state.boostMs = 5_000;
      markEvent(state, "boost");
      remove.add(entity.id);
      continue;
    }
    if (entity.kind === "coin") {
      state.coins += 1;
      markEvent(state, "coin");
      remove.add(entity.id);
      continue;
    }

    if (state.boostMs > 0) {
      state.obstaclesSmashed += 1;
      markEvent(state, "smash");
      remove.add(entity.id);
    } else if (state.shieldCharges > 0) {
      state.shieldCharges -= 1;
      markEvent(state, "shield-hit");
      remove.add(entity.id);
    } else {
      state.failed = true;
      state.failure = "hazard";
      break;
    }
  }

  state.entities = state.entities.filter((entity) => entity.y < 1.12 && !remove.has(entity.id));
  const multiplier = state.boostMs > 0 ? 2 : 1;
  state.score = Math.floor(state.distance * 20 * multiplier) + state.coins * 5 + state.obstaclesSmashed * 3;
}

function spawnRow(state: SwitchbackState) {
  const safeOptions = LANES.filter((lane) => Math.abs(lane - state.lastSafeLane) <= 1);
  const safeLane = safeOptions[Math.floor(nextRandom(state) * safeOptions.length)] ?? 0;
  const hazardLanes = LANES.filter((lane) => lane !== safeLane);
  const doubleHazard = state.rowsSpawned >= 4 && nextRandom(state) > 0.48;
  const selectedHazards = doubleHazard
    ? hazardLanes
    : [hazardLanes[Math.floor(nextRandom(state) * hazardLanes.length)] ?? hazardLanes[0]];

  state.rowsSpawned += 1;
  const row = state.rowsSpawned;
  for (const lane of selectedHazards) {
    state.entities.push({
      id: state.nextId++,
      row,
      kind: nextRandom(state) > 0.42 ? "piston" : "spikes",
      lane,
      safeLane,
      y: -0.12,
    });
  }

  const pickupKind = pickupForRow(row, nextRandom(state));
  if (pickupKind) {
    state.entities.push({ id: state.nextId++, row, kind: pickupKind, lane: safeLane, safeLane, y: -0.12 });
  }
  state.lastSafeLane = safeLane;
}

function pickupForRow(row: number, random: number): RunnerEntityKind | null {
  if (row % 9 === 0) return "boost";
  if (row % 6 === 0) return "shield";
  if (row % 2 === 0 || random > 0.7) return "coin";
  return null;
}

function nextRandom(state: SwitchbackState) {
  state.seed = (Math.imul(state.seed, 1_664_525) + 1_013_904_223) >>> 0;
  return state.seed / 4_294_967_296;
}

function clampLane(value: number): Lane {
  if (value <= -1) return -1;
  if (value >= 1) return 1;
  return 0;
}

function markEvent(state: SwitchbackState, event: NonNullable<SwitchbackState["event"]>) {
  state.event = event;
  state.eventNonce += 1;
}
