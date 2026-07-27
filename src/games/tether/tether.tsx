"use client";
/* eslint-disable react-hooks/set-state-in-effect -- the game loop drives state from rAF. */

import { useCallback, useEffect, useRef, useState } from "react";
import { createTetherState, step, type TetherState } from "./simulation";
import { play } from "@/lib/audio";

/**
 * TETHER — Three.js portrait arcade game.
 *
 * The renderer is imported lazily so Three never lands in the initial bundle,
 * and the whole thing tears itself down when it leaves the screen.
 */
export function Tether({ active = true }: { active?: boolean }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const renderer = useRef<import("./renderer").TetherRenderer | null>(null);
  // Seeded lazily inside an effect: Date.now() during render is impure.
  const world = useRef<TetherState>(createTetherState(1));
  const release = useRef(false);
  const [hud, setHud] = useState({ score: 0, combo: 0, height: 0, failed: false, started: false });
  const [best, setBest] = useState(0);

  const reset = useCallback(() => {
    world.current = createTetherState(Date.now() % 100000);
    release.current = false;
    setHud({ score: 0, combo: 0, height: 0, failed: false, started: false });
  }, []);

  useEffect(() => {
    setBest(Number(localStorage.getItem("tether-best") ?? 0));
    world.current = createTetherState(Date.now() % 100000);
  }, []);

  useEffect(() => {
    if (!active || !canvas.current) return;
    let frame = 0;
    let disposed = false;
    let previous = performance.now();
    const element = canvas.current;

    const fit = () => {
      const parent = element.parentElement;
      if (parent && renderer.current) renderer.current.resize(parent.clientWidth, parent.clientHeight);
    };

    void import("./renderer").then(({ TetherRenderer }) => {
      if (disposed) return;
      renderer.current = new TetherRenderer(element);
      fit();
      const loop = (now: number) => {
        const dt = Math.min(48, now - previous);
        previous = now;
        const next = step(world.current, dt, { release: release.current });
        release.current = false;
        world.current = next;

        if (next.event === "release") play("flip");
        if (next.event === "latch") play("score");
        if (next.event === "perfect") { play("combo"); renderer.current?.punch(0.6); }
        if (next.event === "decay") { play("power"); renderer.current?.punch(0.4); }
        if (next.event === "dead") {
          play("fail");
          renderer.current?.punch(1);
          setBest((current) => {
            const record = Math.max(current, next.score);
            localStorage.setItem("tether-best", String(record));
            return record;
          });
        }

        renderer.current?.render(next, dt);
        setHud({ score: next.score, combo: next.combo, height: Math.round(next.height * 10), failed: next.failed, started: next.anchorId > 1 || next.phase !== "orbiting" });
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    });

    window.addEventListener("resize", fit);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", fit);
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [active]);

  const onPointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    if (world.current.failed) { reset(); return; }
    release.current = true;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  };

  return (
    <div className="tether" onPointerDown={onPointerDown} role="button" tabIndex={0} aria-label="Tether — tap to release">
      <canvas ref={canvas} className="tether-canvas" />

      <div className="tether-hud">
        <span className="tether-score">{hud.score}</span>
        <span className="tether-sub">{hud.height} M · BEST {best}</span>
        {hud.combo > 1 && <span className="tether-combo">PERFECT ×{hud.combo}</span>}
      </div>

      {!hud.started && !hud.failed && (
        <div className="tether-coach">
          <span className="tether-coach-ring" />
          TAP TO LET GO
        </div>
      )}

      {hud.failed && (
        <div className="tether-over">
          <span>YOU FELL</span>
          <strong>{hud.score}</strong>
          <em>{hud.height} M CLIMBED</em>
          <button type="button" onClick={reset}>GO AGAIN</button>
        </div>
      )}
    </div>
  );
}
