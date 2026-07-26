"use client";
/* eslint-disable react-hooks/set-state-in-effect -- the game loop drives state from rAF. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "../types";
import { play } from "@/lib/audio";
import { Bursts, useBursts } from "@/components/burst";
import { LOOKAHEAD, createSwitchbackState, offsetOf, segmentOf, step, type SwitchbackState } from "./simulation";
import { RAIL_OFFSET, centre, railPath, railPoint, ribbonPath } from "./geometry";

/** Where the runner sits vertically on screen, as a fraction of the viewBox. */
const RUNNER_SCREEN_Y = 0.55;
/** viewBox is 100 wide; height tracks a tall phone so `slice` does not crop the runner. */
const VIEW_H = 212;

/**
 * Blockout renderer. Flat shapes only — the art pass replaces this layer.
 * All gameplay lives in `simulation.ts`; this file only draws state and
 * forwards taps.
 */
export function Switchback({ active, onFinish, onRunningChange }: GameProps) {
  const [state, setState] = useState<SwitchbackState>(() => createSwitchbackState({ seed: 1, spawnEnabled: false }));
  const [running, setRunning] = useState(false);
  const world = useRef(state);
  const flip = useRef(false);
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
      const next = step(world.current, dt, { flip: flip.current });
      flip.current = false;
      world.current = next;
      setState(next);
      if (next.event === "near-miss") { play("near"); fire(50, 55, "power"); }
      else if (next.event === "coin" || next.event === "shield") play("pickup");
      else if (next.event === "boost") play("power");
      if (next.failed) {
        setRunning(false);
        play("fail");
        finish.current({
          score: next.score,
          durationMs: Math.max(1000, Date.now() - started.current),
          label: next.failure === "caught" ? "CAUGHT" : next.bestCombo >= 4 ? `COMBO ×${next.bestCombo}` : `${segmentOf(next.progress)} SWITCHBACKS`,
        });
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, active, fire]);

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
    play("flip");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  };

  const segment = segmentOf(state.progress);
  const offset = offsetOf(state.progress);
  const runner = railPoint(segment, offset, state.rail);
  // Scroll the world so the runner stays at a fixed height on screen.
  const cameraY = runner.y - VIEW_H * RUNNER_SCREEN_Y;
  // Draw behind the runner too, so the ribbon reads as continuous rather than
  // starting in mid-air on the first frame.
  const first = segment - 3;
  const last = segment + LOOKAHEAD;

  return (
    <button type="button" className="stage switchback-stage" data-running={running ? "true" : "false"} onPointerDown={tap} aria-label={running ? "Tap to flip rails" : "Tap to start Switchback"}>
      <div className="hud">
        <span>SCORE</span>
        <strong key={state.score}>{String(state.score).padStart(3, "0")}</strong>
        {state.combo > 1 && <em className="combo">COMBO ×{state.combo}</em>}
        {state.chaserActive && (
          <em className={`chase-meter ${state.chaseGap < 1.2 ? "is-close" : ""}`} aria-label="Distance from the pursuer">
            <i style={{ width: `${Math.max(4, Math.min(100, (state.chaseGap / 4.2) * 100))}%` }} />
          </em>
        )}
      </div>

      <svg className="switchback-view" viewBox={`0 ${cameraY} 100 ${VIEW_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <polyline className="ribbon-wall" points={ribbonPath(first, last)} strokeWidth={RAIL_OFFSET * 2} transform="translate(0 5)" />
        <polyline className="ribbon" points={ribbonPath(first, last)} strokeWidth={RAIL_OFFSET * 2} />
        <polyline className="centre-stripes" points={ribbonPath(first, last)} />
        <polyline className="rail-line" points={railPath(first, last, 0)} />
        <polyline className="rail-line" points={railPath(first, last, 1)} />

        {Array.from({ length: last - first + 1 }, (_, index) => first + index).map((seg) => {
          const { x, y } = centre(seg, 0);
          return <circle key={`v${seg}`} className="vertex" cx={x} cy={y} r={3} />;
        })}

        {state.drags.map((drag) => {
          const start = railPoint(drag.segment, drag.from, drag.rail);
          const end = railPoint(drag.segment, drag.to, drag.rail);
          return <line key={`d${drag.id}`} className={`drag-band is-${drag.kind}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} strokeWidth={11} strokeLinecap="butt" />;
        })}

        {state.hazards.map((hazard) => {
          const start = railPoint(hazard.segment, hazard.from, hazard.rail);
          const end = railPoint(hazard.segment, Math.min(1, hazard.to), hazard.rail);
          return (
            <g key={hazard.id} className={`hazard is-${hazard.kind}`}>
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} strokeWidth={hazard.kind === "spikes" ? 7 : 10} strokeLinecap={hazard.kind === "piston" ? "butt" : "round"} />
              {hazard.kind === "sweeper" && (() => {
                const other = railPoint(hazard.segment, Math.min(1, hazard.to), hazard.rail === 0 ? 1 : 0);
                const pivot = railPoint(hazard.segment, hazard.switchAt ?? hazard.from, hazard.rail === 0 ? 1 : 0);
                return <line className="sweep-arm" x1={pivot.x} y1={pivot.y} x2={other.x} y2={other.y} strokeWidth={10} strokeLinecap="round" />;
              })()}
            </g>
          );
        })}

        {state.pickups.filter((pickup) => !pickup.taken).map((pickup) => {
          const { x, y } = railPoint(pickup.segment, pickup.at, pickup.rail);
          return <circle key={pickup.id} className={`pickup is-${pickup.kind}`} cx={x} cy={y} r={5} />;
        })}

        {state.chaserActive && (() => {
          const trail = Math.max(0, state.progress - state.chaseGap);
          const spot = railPoint(segmentOf(trail), offsetOf(trail), state.rail);
          const close = state.chaseGap < 1.2;
          return <circle className={`chaser ${close ? "is-close" : ""}`} cx={spot.x} cy={spot.y} r={7.5} />;
        })()}

        <circle className={`runner ${state.shield > 0 ? "has-shield" : ""}`} cx={runner.x} cy={runner.y} r={6.5} />
      </svg>

      <ul className="key" aria-label="What the shapes mean">
        <li><i className="k-hazard" />DODGE</li>
        <li><i className="k-coin" />GRAB</li>
        <li><i className="k-drag" />SLOW</li>
        <li><i className="k-sprint" />BOOST</li>
        <li><i className="k-chaser" />CHASER</li>
      </ul>
      <Bursts bursts={bursts} />
      <div className="prompt">{running ? "TAP TO FLIP" : "TAP TO START"}</div>
    </button>
  );
}
