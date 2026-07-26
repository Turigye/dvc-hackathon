"use client";
/* eslint-disable react-hooks/set-state-in-effect -- game loops intentionally drive state from rAF and observer callbacks. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";
import { play } from "@/lib/audio";
import { Bursts, useBursts } from "@/components/burst";
import { GameArt } from "@/components/game-art";

type Block = { x: number; w: number; hue: number };
type Shard = { id: number; x: number; w: number; hue: number; dir: number };

const W = 100;
const BASE_W = 46;
const ROW = 24;
const VISIBLE = 12;

/** STACK — a block slides across the top of the tower; tap to drop it.
 *  Whatever hangs over the edge is sliced off, so the tower narrows every turn. */
export function Stack({ active, onFinish, onRunningChange }: GameProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [shards, setShards] = useState<Shard[]>([]);
  const [running, setRunning] = useState(false);
  const [perfect, setPerfect] = useState(0);
  const [moverHue, setMoverHue] = useState(331);
  const [sway, setSway] = useState(0);
  const [wind, setWind] = useState(0);
  const [rescue, setRescue] = useState(false);
  const mover = useRef<HTMLDivElement | null>(null);
  const list = useRef<Block[]>([]);
  const st = useRef({ x: 0, dir: 1, w: BASE_W, speed: 38, start: 0, hue: 318, wind: 0, misses: 0 });
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
      const s = st.current;
      // Wind: above eight blocks a slow crosswind pushes the moving piece, so the
      // player is reading a drifting target instead of a metronome.
      const storey = list.current.length;
      if (storey > 8) { s.wind = Math.sin(now / 2100) * Math.min(16, (storey - 8) * 1.4); setWind(s.wind); }
      s.x += (s.dir * s.speed + s.wind) * dt;
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
      st.current = { x: 0, dir: 1, w: BASE_W, speed: 38, start: Date.now(), hue: 318, wind: 0, misses: 0 };
      list.current = [{ x: (W - BASE_W) / 2, w: BASE_W, hue: 318 }];
      setBlocks(list.current);
      setShards([]);
      setWind(0);
      setRescue(false);
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
      play("fail");
      const height = list.current.length - 1;
      finish.current({ score: height * 10 + perfect * 25, durationMs: Math.max(1000, Date.now() - s.start), label: height >= 12 ? "SKYSCRAPER" : `${height} HIGH` });
      return;
    }
    const trimmed = s.w - overlap;
    // Rescue block: three sloppy drops in a row and the next piece comes back
    // wide. Comeback potential without making a clean run any easier.
    if (trimmed > 0.8) { s.misses += 1; } else { s.misses = 0; }
    if (s.misses >= 3) { s.misses = 0; setRescue(true); window.setTimeout(() => setRescue(false), 900); }
    if (trimmed > 0.8) {
      setShards((current) => [...current, { id: Date.now(), x: s.x < left ? s.x : right, w: trimmed, hue: s.hue, dir: s.x < left ? -1 : 1 }].slice(-3));
      setPerfect(0);
    } else {
      fire(left + overlap / 2, 78, "power");
      play("combo");
      setPerfect((value) => value + 1);
    }
    s.w = s.misses === 0 && rescue ? Math.min(BASE_W, overlap + 12) : overlap;
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
    <button type="button" className="stage stack-stage" data-running={running ? "true" : "false"} onPointerDown={drop} aria-label={running ? "Tap to drop the block" : "Tap to start Stack"}>
      <div className="hud"><span>{Math.abs(wind) > 6 ? "WINDY" : "HEIGHT"}</span><strong key={score}>{score}</strong>{perfect > 1 && <em className="combo">PERFECT ×{perfect}</em>}
        {rescue && <em className="combo">RESCUE BLOCK</em>}</div>
      <div className="stack-well" style={{ transform: `rotate(${sway.toFixed(2)}deg)`, transformOrigin: "50% 100%" }}>
        {shards.map((shard) => (
          <i key={shard.id} className="stack-shard" style={{ left: `${shard.x}%`, width: `${shard.w}%`, bottom: `${(blocks.length - 1) * ROW - offset}px`, ["--tint" as string]: `hsl(${shard.hue} 92% 62%)`, ["--dir" as string]: shard.dir }} />
        ))}
        {blocks.map((block, index) => (
          <i key={index} className="stack-block" style={{ left: `${block.x}%`, width: `${block.w}%`, bottom: `${index * ROW - offset}px`, ["--tint" as string]: `hsl(${block.hue} 92% ${52 + (index % 3) * 5}%)` }} />
        ))}
        {running && (
          <div ref={mover} className="stack-mover" style={{ bottom: `${blocks.length * ROW - offset}px`, ["--tint" as string]: `hsl(${moverHue} 96% 66%)` }}>
            <GameArt active={active} className="stack-drone-art" src="/assets/games/skyline/sprite-builder-drone.png" />
          </div>
        )}
      </div>
      {perfect > 0 && <GameArt active={active} className="stack-perfect-art" src="/assets/games/skyline/sprite-perfect-burst.png" />}
      <Bursts bursts={bursts} />
      <div className="prompt">{running ? "TAP TO DROP" : "TAP TO START"}</div>
    </button>
  );
}
