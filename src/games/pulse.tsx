"use client";
/* eslint-disable react-hooks/set-state-in-effect -- the game loop drives state from rAF. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";
import { play } from "@/lib/audio";
import { Bursts, useBursts } from "@/components/burst";
import { GameArt } from "@/components/game-art";
import {
  PLAYER_X,
  createPulseState,
  signalY,
  stepPulse,
  type PulsePhase,
  type PulseState,
} from "./pulse-simulation";

const WAVE_POINTS = Array.from({ length: 26 }, (_, index) => index * 4);

function wavePath(elapsedMs: number, phase: PulsePhase) {
  return WAVE_POINTS.map((x) => `${x},${signalY(elapsedMs, x, phase).toFixed(2)}`).join(" ");
}

/**
 * PULSE WEAVE — two signals ride the same travelling waveform, half a cycle
 * apart. One is material and one is a ghost. Tap swaps which signal is real;
 * meet matching charge nodes and use gold sync nodes to extend the combo.
 */
export function Pulse({ active, onFinish, onRunningChange }: GameProps) {
  const [state, setState] = useState<PulseState>(() => createPulseState({ seed: 1, spawnEnabled: false }));
  const [running, setRunning] = useState(false);
  const [swapEffect, setSwapEffect] = useState(0);
  const world = useRef(state);
  const swap = useRef(false);
  const started = useRef(0);
  const { bursts, fire } = useBursts();
  const finish = useRef(onFinish);
  useEffect(() => { finish.current = onFinish; });
  useEffect(() => { onRunningChange?.(running); }, [running, onRunningChange]);

  useEffect(() => {
    if (!running || !active) return;
    let frame = 0;
    let previous = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - previous);
      previous = now;
      const next = stepPulse(world.current, dt, { swap: swap.current });
      swap.current = false;
      world.current = next;
      setState(next);

      if (next.event === "charge") {
        play("score");
        fire(PLAYER_X, signalY(next.elapsedMs, PLAYER_X, next.activePhase), "score");
      } else if (next.event === "sync") {
        play("power");
        fire(PLAYER_X, signalY(next.elapsedMs, PLAYER_X, next.activePhase), "power");
      }

      if (next.failed) {
        setRunning(false);
        play("fail");
        finish.current({
          score: next.score,
          durationMs: Math.max(1000, Date.now() - started.current),
          label: next.bestCombo >= 4 ? `WEAVE ×${next.bestCombo}` : "PHASE BREAK",
        });
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, active, fire]);

  useEffect(() => { if (!active) setRunning(false); }, [active]);
  useEffect(() => {
    if (!active) return;
    [
      "/assets/games/pulse/sprite-charge-cyan-v3.png",
      "/assets/games/pulse/sprite-charge-magenta-v3.png",
      "/assets/games/pulse/sprite-sync-v3.png",
      "/assets/games/pulse/sprite-phase-break-v3.png",
      "/assets/games/pulse/sprite-swap-burst-v3.png",
      "/assets/games/pulse/sprite-weave-crest-v3.png",
    ].forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, [active]);
  useEffect(() => {
    if (!active || swapEffect === 0) return;
    const timeout = window.setTimeout(() => setSwapEffect(0), 420);
    return () => window.clearTimeout(timeout);
  }, [active, swapEffect]);

  const act = () => {
    if (!active) return;
    if (!running) {
      // The first tap is the first swap. The scripted opening node is phase 1,
      // so the rule teaches itself without a separate tutorial screen.
      const fresh = createPulseState({ seed: (Date.now() % 100000) + 1, activePhase: 1 });
      world.current = fresh;
      started.current = Date.now();
      setState(fresh);
      setRunning(true);
      play("flip");
      return;
    }
    swap.current = true;
    setSwapEffect((value) => value + 1);
    play("flip");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(7);
  };

  const signalA = signalY(state.elapsedMs, PLAYER_X, 0);
  const signalB = signalY(state.elapsedMs, PLAYER_X, 1);

  return (
    <button
      type="button"
      className="stage pulse-stage"
      data-running={running ? "true" : "false"}
      onPointerDown={act}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          act();
        }
      }}
      aria-label={running ? "Tap to swap the material signal" : "Tap to start Pulse Weave"}
    >
      <div className="hud">
        <span>SCORE</span>
        <strong key={state.score}>{String(state.score).padStart(3, "0")}</strong>
        {state.combo > 1 && <em className="combo">WEAVE ×{state.combo}</em>}
      </div>

      <svg className="pulse-field" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline className="pulse-wave is-cyan" points={wavePath(state.elapsedMs, 0)} />
        <polyline className="pulse-wave is-magenta" points={wavePath(state.elapsedMs, 1)} />
        <line className="pulse-intercept" x1={PLAYER_X} y1="16" x2={PLAYER_X} y2="84" />
      </svg>

      {state.beats.map((beat) => (
        <span
          key={beat.id}
          className={`pulse-node is-${beat.kind} is-phase-${beat.phase} ${beat.resolved ? "is-resolved" : ""}`}
          style={{ left: `${beat.x}%`, top: `${signalY(state.elapsedMs, beat.x, beat.phase)}%` }}
          aria-hidden="true"
        >
          <GameArt
            active={active}
            className="pulse-node-art"
            src={beat.kind === "sync"
              ? "/assets/games/pulse/sprite-sync-v3.png"
              : `/assets/games/pulse/sprite-charge-${beat.phase === 0 ? "cyan" : "magenta"}-v3.png`}
          />
          <i />
        </span>
      ))}

      <span className={`pulse-signal is-phase-0 ${state.activePhase === 0 ? "is-active" : "is-ghost"}`} style={{ left: `${PLAYER_X}%`, top: `${signalA}%` }} aria-hidden="true">
        <GameArt active={active} className="pulse-weaver-art" src="/assets/games/pulse/sprite-weaver-cyan-v3.png" />
        <i />
      </span>
      <span className={`pulse-signal is-phase-1 ${state.activePhase === 1 ? "is-active" : "is-ghost"}`} style={{ left: `${PLAYER_X}%`, top: `${signalB}%` }} aria-hidden="true">
        <GameArt active={active} className="pulse-weaver-art" src="/assets/games/pulse/sprite-weaver-magenta-v3.png" />
        <i />
      </span>

      {swapEffect > 0 && (
        <GameArt
          key={swapEffect}
          active={active}
          className="pulse-swap-art"
          src="/assets/games/pulse/sprite-swap-burst-v3.png"
        />
      )}
      {state.failed && (
        <GameArt active={active} className="pulse-break-art" src="/assets/games/pulse/sprite-phase-break-v3.png" />
      )}
      {state.combo >= 4 && (
        <GameArt active={active} className="pulse-crest-art" src="/assets/games/pulse/sprite-weave-crest-v3.png" />
      )}

      <div className={`pulse-phase-readout is-phase-${state.activePhase}`}>
        <i /> {state.activePhase === 0 ? "CYAN LIVE" : "MAGENTA LIVE"}
      </div>
      <Bursts bursts={bursts} />
      <div className="prompt">{running ? "TAP TO SWAP" : "TAP TO WEAVE"}</div>
    </button>
  );
}
