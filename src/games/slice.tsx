"use client";
/* eslint-disable react-hooks/set-state-in-effect -- game loops intentionally drive state from rAF and observer callbacks. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";
import { play } from "@/lib/audio";
import { Bursts, useBursts } from "@/components/burst";
import { GameArt } from "@/components/game-art";
import { segmentHitsCircle } from "./pointer-geometry";

type FruitKind = "berry" | "citrus" | "melon" | "star-fruit";
type Shape = { id: number; x: number; y: number; vx: number; vy: number; size: number; hue: number; spin: number; rot: number; kind: FruitKind; bomb?: boolean };
type Half = { id: string; x: number; y: number; dir: number; hue: number; size: number; born: number; kind: FruitKind };
type Point = { x: number; y: number };
type Gesture = { pointerId: number; owner: "undecided" | "feed" | "game"; start: Point; last: Point };

const GRAVITY = 42;
const FRUIT_KINDS: FruitKind[] = ["berry", "citrus", "melon", "star-fruit"];

/** SLICE — shapes are lobbed up from the bottom. Swipe through them to cut.
 *  Cut several in one stroke for a combo. Three misses and the run ends. */
export function Slice({ active, onFinish, onRunningChange }: GameProps) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [halves, setHalves] = useState<Half[]>([]);
  const [trail, setTrail] = useState<Point[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [chain, setChain] = useState(0);
  const [running, setRunning] = useState(false);
  const world = useRef({ shapes: [] as Shape[], lives: 3, score: 0, next: 0, start: 0, seq: 0, stroke: 0 });
  const runningRef = useRef(false);
  const gesture = useRef<Gesture | null>(null);
  const { bursts, fire } = useBursts();
  const finish = useRef(onFinish);
  useEffect(() => { finish.current = onFinish; });
  useEffect(() => { onRunningChange?.(running); }, [running, onRunningChange]);

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
        const count = w.score > 400 ? 3 : 2;
        for (let i = 0; i < count; i++) {
          const id = ++w.seq;
          w.shapes.push({ id, x: 14 + Math.random() * 72, y: 108 + i * 3, vx: (Math.random() - .5) * 24, vy: -(58 + Math.random() * 16), size: 18 + Math.random() * 5, hue: Math.floor(Math.random() * 360), spin: (Math.random() - .5) * 160, rot: 0, kind: FRUIT_KINDS[id % FRUIT_KINDS.length], bomb: w.score > 150 && Math.random() < 0.18 });
        }
        w.next = Math.max(.68, 1.65 - w.score / 1100);
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
            runningRef.current = false;
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

  useEffect(() => { if (!active) { runningRef.current = false; gesture.current = null; setRunning(false); setTrail([]); } }, [active]);

  const cut = (start: Point, end: Point, yScale: number) => {
    const w = world.current;
    const scaledStart = { x: start.x, y: start.y * yScale };
    const scaledEnd = { x: end.x, y: end.y * yScale };
    const hit = w.shapes.filter((shape) => segmentHitsCircle(scaledStart, scaledEnd, { x: shape.x, y: shape.y * yScale }, shape.size * 0.56));
    if (!hit.length) return;
    // Cutting a bomb ends the run outright. Restraint mid-swipe is the skill.
    if (hit.some((shape) => shape.bomb)) {
      runningRef.current = false;
      setRunning(false);
      finish.current({ score: w.score, durationMs: Math.max(1000, Date.now() - w.start), label: "CUT THE BOMB" });
      return;
    }
    // Chain reaction: a cut shape detonates neighbours it is touching, and those
    // detonate theirs. Placement of the swipe now matters as much as landing it.
    const chained = new Set(hit.map((shape) => shape.id));
    let frontier = hit;
    while (frontier.length) {
      const next = w.shapes.filter((shape) =>
        !chained.has(shape.id) && !shape.bomb &&
        frontier.some((source) => Math.hypot(source.x - shape.x, (source.y - shape.y) * 0.55) < (source.size + shape.size) * 0.62));
      if (!next.length) break;
      for (const shape of next) chained.add(shape.id);
      frontier = next;
    }
    const chainBonus = chained.size - hit.length;
    const ids = chained;
    const cutShapes = w.shapes.filter((shape) => ids.has(shape.id));
    w.shapes = w.shapes.filter((shape) => !ids.has(shape.id));
    for (const shape of cutShapes) fire(shape.x, shape.y, chainBonus > 0 ? "power" : "score");
    w.stroke += hit.length;
    if (chainBonus > 0) { setChain(chainBonus); window.setTimeout(() => setChain(0), 700); }
    play(w.stroke > 2 ? "combo" : "score");
    w.score += (hit.length * 10 + chainBonus * 25) * Math.max(1, w.stroke);
    setScore(w.score);
    setCombo(w.stroke);
    setHalves((current) => [...current, ...cutShapes.map((shape) => ({ id: `${shape.id}:split`, x: shape.x, y: shape.y, dir: shape.vx >= 0 ? 1 : -1, hue: shape.hue, size: shape.size, born: Date.now(), kind: shape.kind }))].slice(-8));
  };

  const track = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100 };
    const previous = gesture.current?.last ?? point;
    if (gesture.current) gesture.current.last = point;
    setTrail((current) => [...current, point].slice(-12));
    if (runningRef.current) cut(previous, point, rect.height / rect.width);
  };

  const begin = (event: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current && gesture.current.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100 };
    gesture.current = { pointerId: event.pointerId, owner: "undecided", start: point, last: point };
    world.current.stroke = 0;
    if (!runningRef.current) {
      world.current = { shapes: [], lives: 3, score: 0, next: 0, start: Date.now(), seq: 0, stroke: 0 };
      runningRef.current = true;
      setShapes([]); setHalves([]); setScore(0); setLives(3); setCombo(0); setRunning(true);
    }
    setTrail([point]);
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId || current.owner === "feed") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100 };
    if (current.owner === "undecided") {
      const dx = Math.abs(point.x - current.start.x);
      const dy = Math.abs((point.y - current.start.y) * rect.height / rect.width);
      if (dy > 10 && dy > dx * 1.2) { current.owner = "feed"; setTrail([]); return; }
      if (dx < 8 && Math.hypot(dx, dy) < 12) return;
      current.owner = "game";
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (current.owner === "game") { event.preventDefault(); track(event); }
  };

  const end = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    gesture.current = null;
    world.current.stroke = 0;
    setCombo(0);
    setTrail([]);
  };

  return (
    <div className="stage slice-stage" data-running={running ? "true" : "false"} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <div className="hud"><span>SCORE</span><strong key={score}>{score}</strong>{combo > 1 && <em className="combo">COMBO ×{combo}</em>}
        {chain > 0 && <em className="combo">CHAIN +{chain}</em>}</div>
      <div className="lives" aria-label={`${lives} lives left`}>{[0, 1, 2].map((index) => <i key={index} className={index < lives ? "life" : "life is-lost"} />)}</div>
      {shapes.map((shape) => (
        <i key={shape.id} className={`slice-shape ${shape.bomb ? "is-bomb" : ""}`} style={{ left: `${shape.x}%`, top: `${shape.y}%`, width: `${shape.size}%`, ["--tint" as string]: shape.bomb ? "#12121A" : `hsl(${shape.hue} 95% 60%)`, transform: `translate(-50%, -50%) rotate(${Math.round(shape.rot)}deg)` }}>
          <GameArt active={active} className="slice-fruit-art" src={`/assets/games/slice/sprite-${shape.bomb ? "bomb" : shape.kind}-v2.png`} />
        </i>
      ))}
      {halves.map((half) => (
        <i key={half.id} className="slice-half" style={{ left: `${half.x}%`, top: `${half.y}%`, width: `${half.size}%`, ["--tint" as string]: `hsl(${half.hue} 95% 62%)`, ["--dir" as string]: half.dir }}>
          <GameArt active={active} className="slice-half-art" src="/assets/games/slice/sprite-split-halves-v2.png" />
        </i>
      ))}
      {trail.length > 1 && (
        <svg className="slice-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={trail.map((point) => `${point.x},${point.y}`).join(" ")} />
        </svg>
      )}
      <Bursts bursts={bursts} />
      <div className="prompt">{running ? "SWIPE TO SLICE" : "SWIPE TO START"}</div>
    </div>
  );
}
