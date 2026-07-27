"use client";
/* eslint-disable react-hooks/set-state-in-effect -- the game loop drives state from rAF. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { GameProps } from "../types";
import { play } from "@/lib/audio";
import { Bursts, useBursts } from "@/components/burst";
import { LOOKAHEAD, createSwitchbackState, offsetOf, segmentOf, step, type SwitchbackState } from "./simulation";
import { RAIL_OFFSET, railPath, railPoint, ribbonPath, runnerPose, type RunnerJump } from "./geometry";

type SvgArtProps = {
  active: boolean;
  className: string;
  src: string;
  x: number;
  y: number;
  size: number;
  fallback: ReactNode;
  groupClassName?: string;
  imageTransform?: string;
};

/** Presentation-only SVG image. Its bounds never participate in simulation. */
function SvgArt({ active, className, src, x, y, size, fallback, groupClassName, imageTransform }: SvgArtProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const ready = active && loadedSrc === src && failedSrc !== src;
  return (
    <g className={groupClassName}>
      {/* Never expose blockout geometry during a live run. Artwork failure is
          intentionally quiet rather than turning the finished game back into
          circles, bars, or rounded placeholders. */}
      <g className="switchback-fallback" opacity={active ? 0 : (ready ? 0 : 1)}>{fallback}</g>
      {active && failedSrc !== src && (
        <image
          className={`switchback-art ${className}`}
          href={src}
          x={x - size / 2}
          y={y - size / 2}
          width={size}
          height={size}
          preserveAspectRatio="xMidYMid meet"
          transform={imageTransform}
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
        />
      )}
    </g>
  );
}

/** Where the runner sits vertically on screen, as a fraction of the viewBox. */
const RUNNER_SCREEN_Y = 0.55;
/** viewBox is 100 wide; height tracks a tall phone so `slice` does not crop the runner. */
const VIEW_H = 212;

/**
 * Poster renderer. All gameplay lives in `simulation.ts`; this file only draws
 * presentation state and forwards taps.
 */
export function Switchback({ active, onFinish, onRunningChange }: GameProps) {
  const [state, setState] = useState<SwitchbackState>(() => createSwitchbackState({ seed: 1, spawnEnabled: false }));
  const [running, setRunning] = useState(false);
  const [jump, setJump] = useState<RunnerJump | null>(null);
  const [chaserJump, setChaserJump] = useState<RunnerJump | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const world = useRef(state);
  const flip = useRef(false);
  const started = useRef(0);
  const { bursts, fire } = useBursts();
  const finish = useRef(onFinish);
  useEffect(() => { finish.current = onFinish; });
  useEffect(() => { onRunningChange?.(running); }, [running, onRunningChange]);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!running || !active) return;
    let frame = 0;
    let previous = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - previous);
      previous = now;
      const previousState = world.current;
      const requestedFlip = flip.current;
      const next = step(previousState, dt, { flip: requestedFlip });
      if (requestedFlip && next.rail !== previousState.rail) {
        setJump({ fromRail: previousState.rail, toRail: next.rail, startProgress: next.progress });
      }
      if (next.chaserActive && next.chaserRail !== previousState.chaserRail && segmentOf(next.chaserProgress) === segmentOf(previousState.chaserProgress)) {
        setChaserJump({ fromRail: previousState.chaserRail, toRail: next.chaserRail, startProgress: next.chaserProgress });
      }
      flip.current = false;
      world.current = next;
      setState(next);
      if (next.event === "near-miss") { play("near"); fire(50, 55, "power"); }
      else if (next.event === "coin" || next.event === "shield") play("pickup");
      else if (next.event === "boost") play("power");
      else if (next.event === "chaser-hit") { play("near"); fire(50, 68, "power"); }
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
      setJump(null);
      setChaserJump(null);
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
  const pose = runnerPose(state.progress, state.rail, reducedMotion ? null : jump);
  // Scroll the world so the runner stays at a fixed height on screen.
  const cameraY = runner.y - VIEW_H * RUNNER_SCREEN_Y;
  // Draw behind the runner too, so the ribbon reads as continuous rather than
  // starting in mid-air on the first frame.
  const first = segment - 3;
  const last = segment + LOOKAHEAD;

  return (
    <button
      type="button"
      className="stage switchback-stage"
      data-running={running ? "true" : "false"}
      onPointerDown={tap}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          tap();
        }
      }}
      aria-label={running ? "Tap to flip rails" : "Tap to start Switchback"}
    >
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
        <polyline className="rail-line" points={railPath(first, last, 0)} />
        <polyline className="rail-line" points={railPath(first, last, 1)} />

        {state.drags.map((drag) => {
          const start = railPoint(drag.segment, drag.from, drag.rail);
          const end = railPoint(drag.segment, drag.to, drag.rail);
          const x = (start.x + end.x) / 2;
          const y = (start.y + end.y) / 2;
          const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
          return (
            <g key={`d${drag.id}`} className={`band-mark is-${drag.kind}`} transform={`translate(${x} ${y}) rotate(${angle})`}>
              {drag.kind === "sprint" ? (
                <path d="M-9 -6 L-2 0 L-9 6 M-1 -6 L6 0 L-1 6 M8 -6 L15 0 L8 6" />
              ) : (
                <path d="M-13 -7 L-8 7 M-7 -7 L-2 7 M-1 -7 L4 7 M5 -7 L10 7 M11 -7 L16 7" />
              )}
            </g>
          );
        })}

        {state.hazards.map((hazard) => {
          const start = railPoint(hazard.segment, hazard.from, hazard.rail);
          const end = railPoint(hazard.segment, Math.min(1, hazard.to), hazard.rail);
          const art = railPoint(hazard.segment, (hazard.from + Math.min(1, hazard.to)) / 2, hazard.rail);
          // The sprite is sized to the hazard's REAL lethal extent. It used to be
          // a fixed 24 units while a piston only kills across ~5 — so the art was
          // roughly five times wider than its hitbox, which is why contact felt
          // random: you could overlap the picture and live, or die with daylight
          // showing. Art and hitbox are now the same object.
          const lethalLength = Math.hypot(end.x - start.x, end.y - start.y);
          const artSize = Math.max(10, lethalLength);
          return (
            <SvgArt
              key={hazard.id}
              active={active}
              className={`is-${hazard.kind}`}
              groupClassName={`hazard is-${hazard.kind}`}
              src={`/assets/games/switchback/sprite-${hazard.kind}-v2.png`}
              x={art.x}
              y={art.y}
              size={artSize}
              fallback={<>
                <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} strokeWidth={hazard.kind === "spikes" ? 7 : 10} strokeLinecap={hazard.kind === "piston" ? "butt" : "round"} />
                {hazard.kind === "sweeper" && (() => {
                const other = railPoint(hazard.segment, Math.min(1, hazard.to), hazard.rail === 0 ? 1 : 0);
                const pivot = railPoint(hazard.segment, hazard.switchAt ?? hazard.from, hazard.rail === 0 ? 1 : 0);
                return <line className="sweep-arm" x1={pivot.x} y1={pivot.y} x2={other.x} y2={other.y} strokeWidth={10} strokeLinecap="round" />;
                })()}
              </>}
            />
          );
        })}

        {state.pickups.filter((pickup) => !pickup.taken).map((pickup) => {
          const { x, y } = railPoint(pickup.segment, pickup.at, pickup.rail);
          return (
            <SvgArt key={pickup.id} active={active} className={`is-${pickup.kind}`} src={`/assets/games/switchback/sprite-${pickup.kind}-v2.png`} x={x} y={y} size={11} fallback={<circle className={`pickup is-${pickup.kind}`} cx={x} cy={y} r={5} />} />
          );
        })}

        {state.chaserActive && (() => {
          const trail = Math.max(0, state.chaserProgress);
          const chasePose = runnerPose(trail, state.chaserRail, reducedMotion ? null : chaserJump);
          const close = state.chaseGap < 1.2;
          return (
            <SvgArt active={active} className={`is-chaser ${chasePose.jumping ? "is-jumping" : ""} ${state.chaserStunMs > 0 ? "is-stunned" : ""}`} src="/assets/games/switchback/sprite-chaser-v2.png" x={chasePose.x} y={chasePose.y} size={17} imageTransform={`translate(${chasePose.x} ${chasePose.y}) rotate(${chasePose.lean}) scale(${chasePose.facing} 1) translate(${-chasePose.x} ${-chasePose.y})`} fallback={<circle className={`chaser ${close ? "is-close" : ""}`} cx={chasePose.x} cy={chasePose.y} r={7.5} />} />
          );
        })()}

        <SvgArt
          active={active}
          className={`is-runner ${pose.jumping ? "is-jumping" : ""}`}
          src="/assets/games/switchback/sprite-runner-v2.png"
          x={pose.x}
          y={pose.y}
          size={18}
          imageTransform={`translate(${pose.x} ${pose.y}) rotate(${pose.lean}) scale(${pose.facing} 1) translate(${-pose.x} ${-pose.y})`}
          fallback={<circle className={`runner ${state.shield > 0 ? "has-shield" : ""}`} cx={runner.x} cy={runner.y} r={6.5} />}
        />
      </svg>
      <Bursts bursts={bursts} />
      <div className="prompt">{running ? "TAP TO FLIP" : "TAP TO START"}</div>
    </button>
  );
}
