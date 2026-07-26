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
const MASTER_LEVEL = 0.5;
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
  if (master && context) master.gain.setTargetAtTime(next ? 0 : MASTER_LEVEL, context.currentTime, 0.01);
  return muted;
}

function ensureContext() {
  if (context || typeof window === "undefined") return context;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  master = context.createGain();
  master.gain.value = muted ? 0 : MASTER_LEVEL;
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

/* ---- Music: a real chiptune sequencer -------------------------------------
 * The pads were ambient wallpaper. This is an actual 16-step tracker: bass,
 * arpeggio, lead and percussion, scheduled against the audio clock with a
 * lookahead window so timing does not drift when the main thread is busy.
 *
 * Still zero files and zero dependencies — every voice is synthesised.
 */

type Track = {
  bpm: number;
  root: number;
  scale: number[];
  /** 16 steps. -1 is a rest; other numbers index into `scale`. */
  bass: number[];
  arp: number[];
  lead: number[];
  /** 16 steps of percussion: k = kick, h = hat, "." = rest. */
  drums: string;
};

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** One track per game. Tempo and mode carry the mood; the feed changes music as you swipe. */
const TRACKS: Record<string, Track> = {
  switchback: { bpm: 132, root: 110.0, scale: MINOR,
    bass: [0, -1, 0, -1, 4, -1, 3, -1, 0, -1, 0, -1, 5, -1, 4, -1],
    arp:  [0, 3, 4, 7, 4, 3, 0, 3, 0, 3, 4, 7, 9, 7, 4, 3],
    lead: [-1, -1, -1, -1, 7, -1, -1, 9, -1, -1, 7, -1, -1, -1, 4, -1],
    drums: "k..hk..hk..hk.hh" },
  skyline: { bpm: 104, root: 130.8, scale: MAJOR,
    bass: [0, -1, -1, 4, -1, -1, 2, -1, 0, -1, -1, 4, -1, 5, -1, -1],
    arp:  [4, 6, 7, 6, 4, 2, 4, 6, 4, 6, 7, 9, 7, 6, 4, 2],
    lead: [-1, -1, 7, -1, -1, -1, -1, -1, -1, -1, 9, -1, -1, -1, 7, -1],
    drums: "k...h...k...h..." },
  pulse: { bpm: 140, root: 123.5, scale: MINOR,
    bass: [0, 0, -1, 0, 5, -1, 5, -1, 3, 3, -1, 3, 7, -1, 5, -1],
    arp:  [7, 4, 3, 4, 7, 9, 7, 4, 7, 4, 3, 4, 10, 9, 7, 4],
    lead: [-1, -1, -1, 11, -1, -1, -1, -1, -1, -1, -1, 9, -1, -1, -1, -1],
    drums: "k.hhk.hhk.hhk.hh" },
  reflex: { bpm: 126, root: 116.5, scale: MINOR,
    bass: [0, -1, 3, -1, 0, -1, 5, -1, 0, -1, 3, -1, 7, -1, 5, -1],
    arp:  [0, 4, 7, 4, 3, 7, 10, 7, 0, 4, 7, 4, 5, 9, 12, 9],
    lead: [-1, -1, -1, -1, -1, -1, 10, -1, -1, -1, -1, -1, -1, -1, 12, -1],
    drums: "k..hk.h.k..hk.h." },
  overload: { bpm: 96, root: 98.0, scale: MINOR,
    bass: [0, -1, -1, -1, 3, -1, -1, -1, 5, -1, -1, -1, 4, -1, -1, -1],
    arp:  [0, 3, 5, 3, 5, 7, 5, 3, 0, 3, 5, 7, 9, 7, 5, 3],
    lead: [-1, -1, -1, -1, -1, -1, -1, 7, -1, -1, -1, -1, -1, -1, -1, 9],
    drums: "k.....h.k.....h." },
  swarm: { bpm: 118, root: 103.8, scale: MINOR,
    bass: [0, -1, 0, 3, -1, 0, 5, -1, 0, -1, 0, 3, -1, 7, 5, -1],
    arp:  [3, 5, 7, 9, 7, 5, 3, 5, 3, 5, 7, 10, 9, 7, 5, 3],
    lead: [-1, -1, -1, -1, 9, -1, -1, -1, -1, -1, -1, -1, 10, -1, -1, -1],
    drums: "k..hk..hk.hhk..h" },
  slice: { bpm: 150, root: 146.8, scale: MAJOR,
    bass: [0, -1, 4, -1, 2, -1, 4, -1, 0, -1, 4, -1, 5, -1, 4, -1],
    arp:  [7, 9, 11, 9, 7, 4, 7, 9, 7, 9, 11, 13, 11, 9, 7, 4],
    lead: [-1, -1, -1, -1, 11, -1, -1, -1, -1, -1, -1, -1, 13, -1, -1, -1],
    drums: "k.hhk.hhk.hhkhhh" },
  "color-rings": { bpm: 112, root: 138.6, scale: MAJOR,
    bass: [0, -1, -1, 4, -1, 2, -1, -1, 0, -1, -1, 4, -1, 5, -1, -1],
    arp:  [4, 7, 9, 7, 4, 2, 4, 7, 4, 7, 9, 11, 9, 7, 4, 2],
    lead: [-1, -1, 9, -1, -1, -1, 7, -1, -1, -1, 11, -1, -1, -1, 9, -1],
    drums: "k...h.h.k...h.h." },
};

const noteAt = (track: Track, degree: number, octave = 0) =>
  track.root * Math.pow(2, (track.scale[degree % track.scale.length] + 12 * (octave + Math.floor(degree / track.scale.length))) / 12);

let musicTimer: number | null = null;
let step = 0;
let nextNoteTime = 0;
let current: Track | null = null;

function tone(freq: number, at: number, seconds: number, wave: OscillatorType, level: number) {
  if (!context || !master) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(gain);
  gain.connect(master);
  osc.onended = () => gain.disconnect();
  osc.start(at);
  osc.stop(at + seconds + 0.02);
}

function percussion(kind: "k" | "h", at: number) {
  if (!context || !master) return;
  if (kind === "k") {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(46, at + 0.12);
    gain.gain.setValueAtTime(0.14, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    osc.connect(gain); gain.connect(master);
    osc.onended = () => gain.disconnect();
    osc.start(at); osc.stop(at + 0.18);
    return;
  }
  const length = Math.floor(context.sampleRate * 0.03);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(0.05, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
  source.connect(gain); gain.connect(master);
  source.onended = () => gain.disconnect();
  source.start(at);
}

function scheduleStep(track: Track, index: number, at: number) {
  const beat = 60 / track.bpm / 4;
  if (track.bass[index] >= 0) tone(noteAt(track, track.bass[index], -2), at, beat * 1.8, "square", 0.075);
  if (track.arp[index] >= 0) tone(noteAt(track, track.arp[index], 0), at, beat * 0.85, "triangle", 0.045);
  if (track.lead[index] >= 0) tone(noteAt(track, track.lead[index], 1), at, beat * 2.4, "square", 0.035);
  const hit = track.drums[index];
  if (hit === "k" || hit === "h") percussion(hit, at);
}

/** Starts the track for a game slug. Safe to call repeatedly. */
export function startMusic(slug: string) {
  const next = TRACKS[slug] ?? TRACKS.switchback;
  if (current === next && musicTimer !== null) return;
  stopMusic();
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx || !master) return;
  if (ctx.state === "suspended") void ctx.resume();
  current = next;
  step = 0;
  nextNoteTime = ctx.currentTime + 0.06;
  const beat = 60 / next.bpm / 4;
  // Lookahead scheduler: the timer only queues notes, the audio clock plays
  // them, so a busy main thread cannot make the music stutter.
  musicTimer = window.setInterval(() => {
    if (!context || muted || !current) return;
    while (nextNoteTime < context.currentTime + 0.12) {
      scheduleStep(current, step % 16, nextNoteTime);
      nextNoteTime += beat;
      step += 1;
    }
  }, 25);
}

export function stopMusic() {
  if (musicTimer !== null) { window.clearInterval(musicTimer); musicTimer = null; }
  current = null;
}

/** Stops everything immediately — used when a card leaves the viewport. */
export function silence() {
  if (!context || !master) return;
  master.gain.setTargetAtTime(0, context.currentTime, 0.005);
  if (!muted && master) master.gain.setTargetAtTime(MASTER_LEVEL, context.currentTime + 0.06, 0.01);
}
