"use client";
/* eslint-disable react-hooks/set-state-in-effect -- the game loop drives state from rAF. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";
import { play } from "@/lib/audio";
import { Bursts, useBursts } from "@/components/burst";

/**
 * REFLEX — a ring sweeps around the dial. Tap while it is inside the lit arc.
 * The arc shrinks and the sweep speeds up every hit; one miss ends the run.
 * Rule: `Tap when the sweep hits the arc.`
 */

const START_ARC = 62;
const MIN_ARC = 17;

export function Reflex({ active, onFinish, onRunningChange }: GameProps) {
  const [angle, setAngle] = useState(0);
  const [target, setTarget] = useState(90);
  const [arc, setArc] = useState(START_ARC);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const [decoy, setDecoy] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const world = useRef({ angle: 0, target: 90, arc: START_ARC, speed: 150, score: 0, streak: 0, dir: 1, start: 0, decoy: 180 });
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
      w.angle = (w.angle + w.dir * w.speed * dt + 360) % 360;
      setAngle(w.angle);
      // Past 6 hits a faster decoy hand joins the dial. Only the real one counts.
      if (w.streak >= 6) { w.decoy = (w.decoy + w.dir * w.speed * 1.7 * dt + 360) % 360; setDecoy(w.decoy); }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, active]);

  useEffect(() => { if (!active) setRunning(false); }, [active]);

  const tap = () => {
    if (!active) return;
    const w = world.current;
    if (!running) {
      world.current = { angle: 0, target: 90, arc: START_ARC, speed: 150, score: 0, streak: 0, dir: 1, start: Date.now(), decoy: 180 };
      setAngle(0); setTarget(90); setArc(START_ARC); setScore(0); setStreak(0); setFlash(null); setDecoy(null); setRunning(true);
      return;
    }
    // Past the speed/arc caps the decoy becomes a real hazard rather than
    // decoration: tapping while it sits on the arc ends the run. This is the
    // one axis that keeps escalating after everything else has bottomed out.
    if (w.streak >= 6) {
      const decoyDelta = Math.abs(((w.decoy - w.target + 540) % 360) - 180);
      if (decoyDelta <= w.arc / 2) {
        setRunning(false);
        play("fail");
        setFlash("miss");
        finish.current({ score: w.score, durationMs: Math.max(1000, Date.now() - w.start), label: "HIT THE DECOY" });
        return;
      }
    }
    const delta = Math.abs(((w.angle - w.target + 540) % 360) - 180);
    const hit = delta <= w.arc / 2;
    if (!hit) {
      setRunning(false);
      play("fail");
      setFlash("miss");
      finish.current({ score: w.score, durationMs: Math.max(1000, Date.now() - w.start), label: w.streak >= 8 ? `STREAK ${w.streak}` : `${w.score} HITS` });
      return;
    }
    fire(50 + 36 * Math.cos((w.target - 90) * Math.PI / 180), 50 + 36 * Math.sin((w.target - 90) * Math.PI / 180), "score");
    w.streak += 1;
    play(w.streak > 3 ? "combo" : "score");
    w.score += 10 * Math.min(5, w.streak);
    w.arc = Math.max(MIN_ARC, w.arc - 2.6);
    w.speed = Math.min(430, w.speed + 13);
    w.dir = Math.random() < 0.28 ? -w.dir : w.dir;
    w.target = Math.random() * 360;
    setScore(w.score); setStreak(w.streak); setArc(w.arc); setTarget(w.target);
    setFlash("hit");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(9);
    window.setTimeout(() => setFlash(null), 140);
  };

  return (
    <button type="button" className={`stage reflex-stage ${flash ? `is-${flash}` : ""}`} data-running={running ? "true" : "false"} onPointerDown={tap} aria-label={running ? "Tap when the sweep is inside the arc" : "Tap to start Reflex"}>
      <div className="hud"><span>SCORE</span><strong key={score}>{String(score).padStart(3, "0")}</strong>{streak > 1 && <em className="combo">STREAK ×{streak}</em>}</div>
      <svg className="reflex-dial" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="dial-track" cx="50" cy="50" r="36" />
        <circle
          className="dial-arc"
          cx="50" cy="50" r="36"
          strokeDasharray={`${(arc / 360) * 226} 226`}
          transform={`rotate(${target - arc / 2 - 90} 50 50)`}
        />
        {decoy !== null && <line className="dial-decoy" x1="50" y1="50" x2="50" y2="16" transform={`rotate(${decoy} 50 50)`} />}
        <line className="dial-hand" x1="50" y1="50" x2="50" y2="12" transform={`rotate(${angle} 50 50)`} />
        <circle className="dial-hub" cx="50" cy="50" r="4" />
      </svg>
      <Bursts bursts={bursts} />
      <div className="prompt">{running ? "TAP ON THE ARC" : "TAP TO START"}</div>
    </button>
  );
}
