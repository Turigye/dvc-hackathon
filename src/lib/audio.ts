/**
 * Tiny procedural audio bus.
 *
 * Deliberately no library and no sound files. Howler and Tone.js both assume
 * you are loading samples; we have none, and stock audio carries the same
 * licence and originality problems as stock art (`AGENTS.md`). ZzFX is the
 * right idea at ~1KB, so this is that idea written directly against WebAudio —
 * zero dependencies, zero bytes to download, nothing to preload, and every
 * sound is original by construction.
 *
 * Rules from `game-feel-and-juice` and `game-asset-integrator`:
 * - Muted by default; audio only ever starts from a real user gesture.
 * - Never blocks the first playable action.
 * - One shared context, voices capped, nodes disposed on stop.
 */

export type Cue =
  | "tap" | "flip" | "score" | "combo" | "pickup"
  | "power" | "near" | "fail" | "best";

type Voice = { wave: OscillatorType; from: number; to: number; ms: number; gain: number; sweepMs?: number };

/** One recipe per cue. Kept as data so cues stay tunable without touching the engine. */
const CUES: Record<Cue, Voice[]> = {
  tap:    [{ wave: "triangle", from: 420, to: 300, ms: 55, gain: 0.16 }],
  flip:   [{ wave: "square", from: 300, to: 620, ms: 70, gain: 0.13 }],
  score:  [{ wave: "triangle", from: 660, to: 990, ms: 90, gain: 0.17 }],
  combo:  [{ wave: "square", from: 700, to: 1180, ms: 70, gain: 0.14 },
           { wave: "triangle", from: 1180, to: 1560, ms: 90, gain: 0.11 }],
  pickup: [{ wave: "sine", from: 880, to: 1320, ms: 80, gain: 0.18 }],
  power:  [{ wave: "sawtooth", from: 200, to: 900, ms: 220, gain: 0.12 }],
  near:   [{ wave: "sine", from: 1400, to: 900, ms: 70, gain: 0.1 }],
  fail:   [{ wave: "sawtooth", from: 320, to: 70, ms: 320, gain: 0.2 }],
  best:   [{ wave: "triangle", from: 620, to: 930, ms: 110, gain: 0.16 },
           { wave: "triangle", from: 930, to: 1400, ms: 150, gain: 0.14 }],
};

const STORAGE_KEY = "thumbtrance-muted";
let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = true;
let active = 0;
const MAX_VOICES = 8;

export function isMuted() {
  return muted;
}

/** Reads the stored preference. Safe to call during render; never creates audio. */
export function loadMutePreference() {
  if (typeof localStorage === "undefined") return true;
  muted = localStorage.getItem(STORAGE_KEY) !== "off";
  return muted;
}

/** Must be called from a user gesture — browsers refuse to start audio otherwise. */
export function setMuted(next: boolean) {
  muted = next;
  if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  if (!next) ensureContext();
  if (next) stopMusic();
  if (master && context) master.gain.setTargetAtTime(next ? 0 : 0.9, context.currentTime, 0.01);
  return muted;
}

function ensureContext() {
  if (context || typeof window === "undefined") return context;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  master = context.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(context.destination);
  return context;
}

/** Fire and forget. Silent when muted, and a no-op if the browser has no audio. */
export function play(cue: Cue) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx || !master) return;
  if (ctx.state === "suspended") void ctx.resume();
  if (active >= MAX_VOICES) return; // Cap voices rather than let taps stack into mush.

  for (const voice of CUES[cue]) {
    const start = ctx.currentTime;
    const seconds = voice.ms / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = voice.wave;
    osc.frequency.setValueAtTime(voice.from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, voice.to), start + seconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(voice.gain, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    active += 1;
    osc.onended = () => { active = Math.max(0, active - 1); gain.disconnect(); };
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }
}

/* ---- Background music ----------------------------------------------------
 * Slow procedural pads rather than a soundtrack file: nothing to download, no
 * licence surface, and each world gets its own root note so swiping between
 * games changes the mood. Deliberately quiet and sparse — it should sit under
 * the cues, never compete with them.
 */

const SCALE = [0, 3, 5, 7, 10, 12];
let musicTimer: number | null = null;
let musicRoot = 110;

export function startMusic(worldIndex: number) {
  stopMusic();
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx || !master) return;
  musicRoot = [110, 98, 123.5, 87, 130.8, 116.5, 103.8, 92.5][worldIndex % 8];
  let step = 0;
  const voice = () => {
    if (muted || !context || !master) return;
    const semitone = SCALE[step % SCALE.length];
    const freq = musicRoot * Math.pow(2, semitone / 12);
    for (const mult of [1, 1.5]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      osc.type = "sine";
      osc.frequency.value = freq * mult;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.9);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
      osc.connect(gain);
      gain.connect(master);
      osc.onended = () => gain.disconnect();
      osc.start(now);
      osc.stop(now + 2.7);
    }
    step += step % 3 === 2 ? 2 : 1;
  };
  voice();
  musicTimer = window.setInterval(voice, 2400);
}

export function stopMusic() {
  if (musicTimer !== null) { window.clearInterval(musicTimer); musicTimer = null; }
}

/** Stops everything immediately — used when a card leaves the viewport. */
export function silence() {
  if (!context || !master) return;
  master.gain.setTargetAtTime(0, context.currentTime, 0.005);
  if (!muted && master) master.gain.setTargetAtTime(0.9, context.currentTime + 0.06, 0.01);
}
