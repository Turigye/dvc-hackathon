"use client";
/* eslint-disable react-hooks/set-state-in-effect -- game loops intentionally drive state from rAF and observer callbacks. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";

type Shape = { id: number; x: number; y: number; vx: number; vy: number; size: number; hue: number; spin: number; rot: number };
type Half = { id: string; x: number; y: number; dir: number; hue: number; size: number; born: number };
type Point = { x: number; y: number };

const GRAVITY = 42;

/** SLICE — shapes are lobbed up from the bottom. Swipe through them to cut.
 *  Cut several in one stroke for a combo. Three misses and the run ends. */
export function Slice({ active, onFinish }: GameProps) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [halves, setHalves] = useState<Half[]>([]);
  const [trail, setTrail] = useState<Point[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [running, setRunning] = useState(false);
  const world = useRef({ shapes: [] as Shape[], lives: 3, score: 0, next: 0, start: 0, seq: 0, stroke: 0 });
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
      w.next -= dt;
      if (w.next <= 0) {
        const count = w.score > 400 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          w.shapes.push({ id: ++w.seq, x: 14 + Math.random() * 72, y: 108, vx: (Math.random() - .5) * 26, vy: -(58 + Math.random() * 16), size: 15 + Math.random() * 6, hue: Math.floor(Math.random() * 360), spin: (Math.random() - .5) * 200, rot: 0 });
        }
        w.next = Math.max(.52, 1.5 - w.score / 900);
      }
      const kept: Shape[] = [];
      for (const shape of w.shapes) {
        shape.vy += GRAVITY * dt;
        shape.x += shape.vx * dt;
        shape.y += shape.vy * dt;
        shape.rot += shape.spin * dt;
        if (shape.y > 118 && shape.vy > 0) {
          w.lives -= 1;
          setLives(w.lives);
          if (w.lives <= 0) {
            setRunning(false);
            finish.current({ score: w.score, durationMs: Math.max(1000, Date.now() - w.start), label: w.score >= 600 ? "BLADE MASTER" : "MISSED IT" });
            return;
          }
        } else kept.push(shape);
      }
      w.shapes = kept;
      setShapes([...kept]);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running, active]);

  useEffect(() => { if (!active) { setRunning(false); setTrail([]); } }, [active]);

  const cut = (point: Point) => {
    const w = world.current;
    const hit = w.shapes.filter((shape) => Math.hypot(shape.x - point.x, shape.y - point.y) < shape.size / 1.5);
    if (!hit.length) return;
    const ids = new Set(hit.map((shape) => shape.id));
    w.shapes = w.shapes.filter((shape) => !ids.has(shape.id));
    w.stroke += hit.length;
    w.score += hit.length * 10 * Math.max(1, w.stroke);
    setScore(w.score);
    setCombo(w.stroke);
    setHalves((current) => [...current, ...hit.flatMap((shape) => [-1, 1].map((dir) => ({ id: `${shape.id}:${dir}`, x: shape.x, y: shape.y, dir, hue: shape.hue, size: shape.size, born: Date.now() })))].slice(-12));
  };

  const track = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100 };
    setTrail((current) => [...current, point].slice(-12));
    if (running) cut(point);
  };

  const begin = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    world.current.stroke = 0;
    if (!running) {
      world.current = { shapes: [], lives: 3, score: 0, next: 0, start: Date.now(), seq: 0, stroke: 0 };
      setShapes([]); setHalves([]); setScore(0); setLives(3); setCombo(0); setRunning(true);
    }
    track(event);
  };

  return (
    <div className="stage slice-stage" onPointerDown={begin} onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && track(event)} onPointerUp={() => { world.current.stroke = 0; setCombo(0); setTrail([]); }}>
      <div className="hud"><span>SCORE</span><strong>{score}</strong>{combo > 1 && <em className="combo">COMBO ×{combo}</em>}</div>
      <div className="lives" aria-label={`${lives} lives left`}>{[0, 1, 2].map((index) => <i key={index} className={index < lives ? "life" : "life is-lost"} />)}</div>
      {shapes.map((shape) => (
        <i key={shape.id} className="slice-shape" style={{ left: `${shape.x}%`, top: `${shape.y}%`, width: `${shape.size}%`, background: `hsl(${shape.hue} 95% 60%)`, transform: `translate(-50%, -50%) rotate(${Math.round(shape.rot)}deg)` }} />
      ))}
      {halves.map((half) => (
        <i key={half.id} className="slice-half" style={{ left: `${half.x}%`, top: `${half.y}%`, width: `${half.size}%`, background: `hsl(${half.hue} 95% 62%)`, ["--dir" as string]: half.dir }} />
      ))}
      {trail.length > 1 && (
        <svg className="slice-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={trail.map((point) => `${point.x},${point.y}`).join(" ")} />
        </svg>
      )}
      <div className="prompt">{running ? "SWIPE TO SLICE" : "SWIPE TO START"}</div>
    </div>
  );
}
