"use client";
/* eslint-disable react-hooks/set-state-in-effect -- the game loop drives state from rAF. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";
import { play } from "@/lib/audio";

/**
 * SWARM — bugs cross the screen. Tap them before they escape.
 * Red ones are traps: tap one and the run ends. Three escapes also ends it.
 * Rule: `Tap the swarm. Never the red.`
 *
 * Input model is tapping specific moving objects — distinct from the timing
 * taps everywhere else in the feed.
 */

type Bug = { id: number; x: number; y: number; vx: number; vy: number; r: number; bad: boolean };

export function Swarm({ active, onFinish, onRunningChange }: GameProps) {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [running, setRunning] = useState(false);
  const world = useRef({ bugs: [] as Bug[], score: 0, lives: 3, next: 0, seq: 0, start: 0, rate: 1 });
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

      w.next -= dt;
      if (w.next <= 0) {
        const fromLeft = Math.random() < 0.5;
        const speed = 16 + Math.random() * 14 + w.score / 90;
        w.bugs.push({
          id: ++w.seq,
          x: fromLeft ? -8 : 108,
          y: 16 + Math.random() * 68,
          vx: fromLeft ? speed : -speed,
          vy: (Math.random() - 0.5) * 12,
          r: 7.5,
          bad: w.score > 60 && Math.random() < 0.24,
        });
        w.next = Math.max(0.32, 1.15 - w.score / 700);
      }

      const kept: Bug[] = [];
      for (const bug of w.bugs) {
        bug.x += bug.vx * dt;
        bug.y = Math.max(10, Math.min(88, bug.y + bug.vy * dt));
        const gone = bug.x < -14 || bug.x > 114;
        if (!gone) { kept.push(bug); continue; }
        if (!bug.bad) {
          // Anything you let past comes back with a friend. Ignoring the board loses.
          w.next = Math.min(w.next, 0.18);
          w.lives -= 1;
          setLives(w.lives);
          if (w.lives <= 0) {
            setRunning(false);
            finish.current({ score: w.score, durationMs: Math.max(1000, Date.now() - w.start), label: `${w.score} CAUGHT` });
            return;
          }
        }
      }
      w.bugs = kept;
      setBugs([...kept]);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, active]);

  useEffect(() => { if (!active) setRunning(false); }, [active]);

  const tap = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    const w = world.current;
    if (!running) {
      world.current = { bugs: [], score: 0, lives: 3, next: 0, seq: 0, start: Date.now(), rate: 1 };
      setBugs([]); setScore(0); setLives(3); setRunning(true);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const hit = w.bugs.find((bug) => Math.hypot(bug.x - x, (bug.y - y) * 0.46) < bug.r);
    if (!hit) return;
    if (hit.bad) {
      play("fail");
      setRunning(false);
      finish.current({ score: w.score, durationMs: Math.max(1000, Date.now() - w.start), label: "TOUCHED THE RED" });
      return;
    }
    w.bugs = w.bugs.filter((bug) => bug.id !== hit.id);
    play("pickup");
    w.score += 10;
    setScore(w.score);
    setBugs([...w.bugs]);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(7);
  };

  return (
    <div className="stage swarm-stage" data-running={running ? "true" : "false"} onPointerDown={tap} role="button" tabIndex={0} aria-label={running ? "Tap the bugs, avoid the red" : "Tap to start Swarm"}>
      <div className="hud"><span>SCORE</span><strong>{String(score).padStart(3, "0")}</strong></div>
      <div className="lives" aria-label={`${lives} lives left`}>{[0, 1, 2].map((index) => <i key={index} className={index < lives ? "life" : "life is-lost"} />)}</div>
      {bugs.map((bug) => (
        <i key={bug.id} className={`bug ${bug.bad ? "is-bad" : ""}`} style={{ left: `${bug.x}%`, top: `${bug.y}%` }} />
      ))}
      <div className="prompt">{running ? "TAP THE SWARM" : "TAP TO START"}</div>
    </div>
  );
}
