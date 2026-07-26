"use client";
/* eslint-disable react-hooks/set-state-in-effect -- game loops intentionally drive state from rAF and observer callbacks. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";

type Block = { x: number; w: number; hue: number };
type Shard = { id: number; x: number; w: number; hue: number; dir: number };

const W = 100;
const BASE_W = 46;
const ROW = 24;
const VISIBLE = 12;

/** STACK — a block slides across the top of the tower; tap to drop it.
 *  Whatever hangs over the edge is sliced off, so the tower narrows every turn. */
export function Stack({ active, onFinish }: GameProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [shards, setShards] = useState<Shard[]>([]);
  const [running, setRunning] = useState(false);
  const [perfect, setPerfect] = useState(0);
  const [moverHue, setMoverHue] = useState(331);
  const [sway, setSway] = useState(0);
  const mover = useRef<HTMLDivElement | null>(null);
  const list = useRef<Block[]>([]);
  const st = useRef({ x: 0, dir: 1, w: BASE_W, speed: 38, start: 0, hue: 318 });
  const finish = useRef(onFinish);
  useEffect(() => { finish.current = onFinish; });

  useEffect(() => {
    if (!running || !active) return;
    let frame = 0;
    let prev = performance.now();
    const step = (now: number) => {
      const dt = Math.min(64, now - prev) / 1000;
      prev = now;
      const s = st.current;
      s.x += s.dir * s.speed * dt;
      const max = W - s.w;
      if (s.x <= 0) { s.x = 0; s.dir = 1; }
      if (s.x >= max) { s.x = max; s.dir = -1; }
      if (mover.current) { mover.current.style.left = `${s.x}%`; mover.current.style.width = `${s.w}%`; }
      // Height buys instability: the whole tower leans further the taller it gets.
      const height = list.current.length;
      if (height > 4) setSway(Math.sin(now / 620) * Math.min(7, (height - 4) * 0.42));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running, active]);

  useEffect(() => { if (!active) setRunning(false); }, [active]);

  const drop = () => {
    if (!active) return;
    const s = st.current;
    if (!running) {
      st.current = { x: 0, dir: 1, w: BASE_W, speed: 38, start: Date.now(), hue: 318 };
      list.current = [{ x: (W - BASE_W) / 2, w: BASE_W, hue: 318 }];
      setBlocks(list.current);
      setShards([]);
      setPerfect(0);
      setSway(0);
      setMoverHue(331);
      setRunning(true);
      return;
    }
    const top = list.current[list.current.length - 1];
    const left = Math.max(s.x, top.x);
    const right = Math.min(s.x + s.w, top.x + top.w);
    const overlap = right - left;
    if (overlap <= 1.5) {
      setRunning(false);
      const height = list.current.length - 1;
      finish.current({ score: height * 10 + perfect * 25, durationMs: Math.max(1000, Date.now() - s.start), label: height >= 12 ? "SKYSCRAPER" : `${height} HIGH` });
      return;
    }
    const trimmed = s.w - overlap;
    if (trimmed > 0.8) {
      setShards((current) => [...current, { id: Date.now(), x: s.x < left ? s.x : right, w: trimmed, hue: s.hue, dir: s.x < left ? -1 : 1 }].slice(-3));
      setPerfect(0);
    } else {
      setPerfect((value) => value + 1);
    }
    s.w = overlap;
    s.x = left;
    s.hue = (s.hue + 13) % 360;
    setMoverHue((s.hue + 13) % 360);
    s.speed = Math.min(126, s.speed + 3.2);
    list.current = [...list.current, { x: left, w: overlap, hue: s.hue }];
    setBlocks(list.current);
  };

  const offset = Math.max(0, blocks.length - VISIBLE) * ROW;
  const score = Math.max(0, blocks.length - 1) * 10 + perfect * 25;

  return (
    <button type="button" className="stage stack-stage" onPointerDown={drop} aria-label={running ? "Tap to drop the block" : "Tap to start Stack"}>
      <div className="hud"><span>HEIGHT</span><strong>{score}</strong>{perfect > 1 && <em className="combo">PERFECT ×{perfect}</em>}</div>
      <div className="stack-well" style={{ transform: `rotate(${sway.toFixed(2)}deg)`, transformOrigin: "50% 100%" }}>
        {shards.map((shard) => (
          <i key={shard.id} className="stack-shard" style={{ left: `${shard.x}%`, width: `${shard.w}%`, bottom: `${(blocks.length - 1) * ROW - offset}px`, background: `hsl(${shard.hue} 92% 62%)`, ["--dir" as string]: shard.dir }} />
        ))}
        {blocks.map((block, index) => (
          <i key={index} className="stack-block" style={{ left: `${block.x}%`, width: `${block.w}%`, bottom: `${index * ROW - offset}px`, background: `hsl(${block.hue} 92% ${52 + (index % 3) * 5}%)` }} />
        ))}
        {running && <div ref={mover} className="stack-mover" style={{ bottom: `${blocks.length * ROW - offset}px`, background: `hsl(${moverHue} 96% 66%)` }} />}
      </div>
      <div className="prompt">{running ? "TAP TO DROP" : "TAP TO START"}</div>
    </button>
  );
}
