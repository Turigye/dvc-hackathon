"use client";
/* eslint-disable react-hooks/set-state-in-effect -- the game loop drives state from rAF. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "../types";
import { LOOKAHEAD, createSwitchbackState, offsetOf, segmentOf, step, type SwitchbackState } from "./simulation";
import { RAIL_OFFSET, SEGMENT_H, centre, railPoint, ribbonPath } from "./geometry";

/** Where the runner sits vertically on screen, as a fraction of the viewBox. */
const RUNNER_SCREEN_Y = 0.68;
const VIEW_H = SEGMENT_H * (LOOKAHEAD + 1);

/**
 * Blockout renderer. Flat shapes only — the art pass replaces this layer.
 * All gameplay lives in `simulation.ts`; this file only draws state and
 * forwards taps.
 */
export function Switchback({ active, onFinish }: GameProps) {
  const [state, setState] = useState<SwitchbackState>(() => createSwitchbackState({ seed: 1, spawnEnabled: false }));
  const [running, setRunning] = useState(false);
  const world = useRef(state);
  const flip = useRef(false);
  const started = useRef(0);
  const finish = useRef(onFinish);
  useEffect(() => { finish.current = onFinish; });

  useEffect(() => {
    if (!running || !active) return;
    let frame = 0;
    let previous = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - previous);
      previous = now;
      const next = step(world.current, dt, { flip: flip.current });
      flip.current = false;
      world.current = next;
      setState(next);
      if (next.failed) {
        setRunning(false);
        finish.current({
          score: next.score,
          durationMs: Math.max(1000, Date.now() - started.current),
          label: next.bestCombo >= 4 ? `COMBO ×${next.bestCombo}` : `${segmentOf(next.progress)} SWITCHBACKS`,
        });
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, active]);

  useEffect(() => { if (!active) setRunning(false); }, [active]);

  const tap = () => {
    if (!active) return;
    if (!running) {
      const fresh = createSwitchbackState({ seed: (Date.now() % 100000) + 1 });
      world.current = fresh;
      started.current = Date.now();
      setState(fresh);
      setRunning(true);
      return;
    }
    flip.current = true;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  };

  const segment = segmentOf(state.progress);
  const offset = offsetOf(state.progress);
  const runner = railPoint(segment, offset, state.rail);
  // Scroll the world so the runner stays at a fixed height on screen.
  const cameraY = runner.y - VIEW_H * RUNNER_SCREEN_Y;
  const first = Math.max(0, segment - 1);
  const last = segment + LOOKAHEAD;

  return (
    <button type="button" className="stage switchback-stage" onPointerDown={tap} aria-label={running ? "Tap to flip rails" : "Tap to start Switchback"}>
      <div className="hud">
        <span>SCORE</span>
        <strong>{String(state.score).padStart(3, "0")}</strong>
        {state.combo > 1 && <em className="combo">COMBO ×{state.combo}</em>}
      </div>

      <svg className="switchback-view" viewBox={`0 ${cameraY} 100 ${VIEW_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <polyline className="ribbon" points={ribbonPath(first, last)} strokeWidth={RAIL_OFFSET * 2} />
        <polyline className="ribbon-edge" points={ribbonPath(first, last)} strokeWidth={RAIL_OFFSET * 2} />

        {Array.from({ length: last - first + 1 }, (_, index) => first + index).map((seg) => {
          const { x, y } = centre(seg, 0);
          return <circle key={`v${seg}`} className="vertex" cx={x} cy={y} r={3} />;
        })}

        {state.hazards.map((hazard) => {
          const start = railPoint(hazard.segment, hazard.from, hazard.rail);
          const end = railPoint(hazard.segment, Math.min(1, hazard.to), hazard.rail);
          const mid = railPoint(hazard.segment, (hazard.from + Math.min(1, hazard.to)) / 2, hazard.rail);
          return (
            <g key={hazard.id} className={`hazard is-${hazard.kind}`}>
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} strokeWidth={9} strokeLinecap="round" />
              <line className="telegraph" x1={mid.x} y1={mid.y - 46} x2={mid.x} y2={mid.y - 12} strokeWidth={4} />
            </g>
          );
        })}

        {state.pickups.filter((pickup) => !pickup.taken).map((pickup) => {
          const { x, y } = railPoint(pickup.segment, pickup.at, pickup.rail);
          return <circle key={pickup.id} className={`pickup is-${pickup.kind}`} cx={x} cy={y} r={5} />;
        })}

        <circle className={`runner ${state.shield > 0 ? "has-shield" : ""}`} cx={runner.x} cy={runner.y} r={6.5} />
      </svg>

      <div className="prompt">{running ? "TAP TO FLIP" : "TAP TO START"}</div>
    </button>
  );
}
