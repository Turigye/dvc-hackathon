"use client";
/* eslint-disable react-hooks/set-state-in-effect -- the game loop drives state from rAF. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";
import { play } from "@/lib/audio";
import { Bursts, useBursts } from "@/components/burst";
import { GameArt } from "@/components/game-art";

/**
 * PULSE — tap to rise, fall when you don't. Each gate has a coloured half;
 * you may only pass through the half matching your current colour, and your
 * colour flips every time you clear one. Rule: `Tap to rise. Match the gate.`
 *
 * Adapted from the care package's colour/phase-gate idea, written from scratch.
 */

type Gate = { id: number; x: number; safeTop: boolean; liar?: boolean; cleared?: boolean };

const COLORS = ["#FF2E88", "#00E5FF"];
const GRAVITY = 128;
const LIFT = -46;
const GAP = 30;

export function Pulse({ active, onFinish, onRunningChange }: GameProps) {
  const [y, setY] = useState(50);
  const [gates, setGates] = useState<Gate[]>([]);
  const [phase, setPhase] = useState(0);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const world = useRef({ y: 50, vy: 0, gates: [] as Gate[], phase: 0, score: 0, speed: 26, seq: 0, start: 0 });
  const lift = useRef(false);
  const { bursts, fire } = useBursts();
  const finish = useRef(onFinish);
  useEffect(() => { finish.current = onFinish; });
  useEffect(() => { onRunningChange?.(running); }, [running, onRunningChange]);

  useEffect(() => {
    if (!running || !active) return;
    let frame = 0;
    let previous = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - previous) / 1000;
      previous = now;
      const w = world.current;
      if (lift.current) { w.vy = LIFT; lift.current = false; }
      w.vy += GRAVITY * dt;
      w.y += w.vy * dt;

      if (!w.gates.length || w.gates[w.gates.length - 1].x < 62) {
        w.gates.push({ id: ++w.seq, x: 108, safeTop: Math.random() < 0.5, liar: w.score > 40 && Math.random() < 0.22 });
      }
      for (const gate of w.gates) gate.x -= w.speed * dt;

      for (const gate of w.gates) {
        if (gate.cleared || gate.x > 22) continue;
        if (gate.x < 12) {
          // A liar gate draws its opening on the wrong side. It flickers on approach;
          // read the flicker and go the other way.
          const trueTop = gate.liar ? !gate.safeTop : gate.safeTop;
          const gapCentre = trueTop ? 32 : 68;
          const through = Math.abs(w.y - gapCentre) <= GAP / 2;
          if (!through) {
            setRunning(false);
            finish.current({ score: w.score, durationMs: Math.max(1000, Date.now() - w.start), label: `${w.score} GATES` });
            return;
          }
          gate.cleared = true;
          fire(16, w.y, "score");
          play("score");
          w.score += 10;
          w.phase = w.phase === 0 ? 1 : 0;
          w.speed = Math.min(52, w.speed + 0.9);
          setScore(w.score);
          setPhase(w.phase);
        }
      }
      w.gates = w.gates.filter((gate) => gate.x > -14);

      if (w.y < 2 || w.y > 98) {
        setRunning(false);
        finish.current({ score: w.score, durationMs: Math.max(1000, Date.now() - w.start), label: "OUT OF BOUNDS" });
        return;
      }
      setY(w.y);
      setGates([...w.gates]);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, active, fire]);

  useEffect(() => { if (!active) setRunning(false); }, [active]);

  const tap = () => {
    if (!active) return;
    if (!running) {
      world.current = { y: 50, vy: 0, gates: [], phase: 0, score: 0, speed: 26, seq: 0, start: Date.now() };
      setY(50); setGates([]); setScore(0); setPhase(0); setRunning(true);
      return;
    }
    lift.current = true;
    play("tap");
  };

  return (
    <button type="button" className="stage pulse-stage" data-running={running ? "true" : "false"} onPointerDown={tap} aria-label={running ? "Tap to rise" : "Tap to start Pulse"}>
      <div className="hud"><span>SCORE</span><strong key={score}>{String(score).padStart(3, "0")}</strong></div>
      {gates.map((gate) => (
        <div key={gate.id} className={`pulse-gate ${gate.liar ? "is-liar" : ""}`} style={{ left: `${gate.x}%` }}>
          <i className="is-blocked gate-top" style={{ top: 0, height: `${(gate.safeTop ? 32 : 68) - GAP / 2}%` }}>
            <GameArt active={active} className="pulse-gate-cap" src={`/assets/games/pulse/sprite-gate-${gate.liar ? "liar" : "honest"}.png`} />
          </i>
          <i className="is-blocked gate-bottom" style={{ bottom: 0, height: `${100 - ((gate.safeTop ? 32 : 68) + GAP / 2)}%` }}>
            <GameArt active={active} className="pulse-gate-cap" src={`/assets/games/pulse/sprite-gate-${gate.liar ? "liar" : "honest"}.png`} />
          </i>
        </div>
      ))}
      <span className="pulse-bird" style={{ top: `${y}%`, ["--tint" as string]: COLORS[phase] }}>
        <GameArt active={active} className="pulse-trail-art" src="/assets/games/pulse/sprite-energy-trail.png" />
        <i className="pulse-bird-fallback" />
        <GameArt active={active} className="pulse-bird-art" src={`/assets/games/pulse/sprite-bird-${phase === 0 ? "magenta" : "cyan"}.png`} />
      </span>
      <Bursts bursts={bursts} />
      <div className="prompt">{running ? "TAP TO RISE" : "TAP TO START"}</div>
    </button>
  );
}
