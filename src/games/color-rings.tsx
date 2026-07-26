"use client";
/* eslint-disable react-hooks/set-state-in-effect -- game loops intentionally drive state from rAF and observer callbacks. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";
import { play } from "@/lib/audio";
import { Bursts, useBursts } from "@/components/burst";

type Gate = { id: number; y: number; angle: number; cleared: boolean };

const COLORS = ["#FF2E88", "#00E5FF", "#C6FF00", "#FFD400"];
const BALL_Y = 68;
const GAP = 26;

/** COLOR RINGS — the ball falls through four-colour rings. Tap to spin the ring
 *  so the segment under the ball matches the ball's colour. */
export function ColorRings({ active, onFinish }: GameProps) {
  const [gates, setGates] = useState<Gate[]>([]);
  const [ball, setBall] = useState(0);
  const [twin, setTwin] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [pulse, setPulse] = useState(0);
  const world = useRef({ gates: [] as Gate[], ball: 0, twin: null as number | null, score: 0, speed: 20, seq: 0, start: 0 });
  const { bursts, fire } = useBursts();
  const finish = useRef(onFinish);
  useEffect(() => { finish.current = onFinish; });

  useEffect(() => {
    if (!running || !active) return;
    let frame = 0;
    let prev = performance.now();
    const step = (now: number) => {
      const dt = Math.min(64, now - prev) / 1000;
      prev = now;
      const w = world.current;
      for (const gate of w.gates) gate.y -= w.speed * dt;
      const passed = w.gates.find((gate) => !gate.cleared && gate.y <= BALL_Y);
      if (passed) {
        passed.cleared = true;
        const segment = Math.floor((((270 - passed.angle) % 360) + 360) % 360 / 90);
        // Past 60 the ball splits: the segment must satisfy BOTH colours, so a
        // single ring can no longer be solved by one glance.
        const needsTwin = w.twin !== null;
        if (segment !== w.ball && (!needsTwin || segment !== w.twin)) {
          setRunning(false);
          finish.current({ score: w.score, durationMs: Math.max(1000, Date.now() - w.start), label: w.score >= 200 ? "SPECTRUM" : "WRONG COLOUR" });
          return;
        }
        fire(50, BALL_Y, "score");
        play("score");
        w.score += 10;
        w.ball = Math.floor(Math.random() * 4);
        w.twin = w.score >= 60 ? Math.floor(Math.random() * 4) : null;
        setTwin(w.twin);
        w.speed = Math.min(52, w.speed + 1.4);
        setScore(w.score);
        setBall(w.ball);
        setPulse(Date.now());
      }
      w.gates = w.gates.filter((gate) => gate.y > -GAP);
      const last = w.gates[w.gates.length - 1];
      if (!last || last.y < 100 - GAP) w.gates.push({ id: ++w.seq, y: (last?.y ?? BALL_Y) + GAP + 12, angle: Math.floor(Math.random() * 4) * 90, cleared: false });
      setGates([...w.gates]);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running, active, fire]);

  useEffect(() => { if (!active) setRunning(false); }, [active]);

  const spin = () => {
    if (!active) return;
    const w = world.current;
    if (!running) {
      world.current = { gates: [{ id: 1, y: 128, angle: 0, cleared: false }], ball: 0, twin: null, score: 0, speed: 20, seq: 1, start: Date.now() };
      setGates([...world.current.gates]); setBall(0); setTwin(null); setScore(0); setRunning(true);
      return;
    }
    const next = w.gates.find((gate) => !gate.cleared);
    if (next) next.angle += 90;
    setGates([...w.gates]);
  };

  return (
    <button type="button" className="stage rings-stage" onPointerDown={spin} aria-label={running ? "Tap to spin the ring" : "Tap to start Color Rings"}>
      <div className="hud"><span>SCORE</span><strong key={score}>{score}</strong></div>
      {gates.map((gate) => (
        <i key={gate.id} className={`ring ${gate.cleared ? "is-cleared" : ""}`} style={{ top: `${gate.y}%`, transform: `translate(-50%, -50%) rotate(${gate.angle}deg)`, background: `conic-gradient(${COLORS[0]} 0deg 90deg, ${COLORS[1]} 90deg 180deg, ${COLORS[2]} 180deg 270deg, ${COLORS[3]} 270deg 360deg)` }} />
      ))}
      <i key={pulse} className="rings-ball" style={{ top: `${BALL_Y}%`, ["--tint" as string]: COLORS[ball], boxShadow: `0 0 26px ${COLORS[ball]}` }} />
      {twin !== null && <i className="rings-twin" style={{ top: `${BALL_Y}%`, ["--tint" as string]: COLORS[twin], boxShadow: `0 0 18px ${COLORS[twin]}` }} />}
      <Bursts bursts={bursts} />
      <div className="prompt">{running ? "SPIN TO MATCH" : "TAP TO START"}</div>
    </button>
  );
}
