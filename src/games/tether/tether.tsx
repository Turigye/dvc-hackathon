"use client";
/* eslint-disable react-hooks/set-state-in-effect -- the game loop drives state from rAF. */

import { useCallback, useEffect, useRef, useState } from "react";
import { createTetherState, step, type TetherState } from "./simulation";
import { isMuted, loadMutePreference, play, setMuted } from "@/lib/audio";
import type { GameProps } from "../types";

const scoreFormat = new Intl.NumberFormat("en-US");
/** A long run can reach five figures. Shrink the readout by digit count rather
 *  than letting it overflow the card or wrap. */
const scoreScale = (score: number) => Math.max(0.46, 1 - Math.max(0, String(score).length - 3) * 0.15);

/**
 * TETHER — Three.js portrait arcade game.
 *
 * The renderer is imported lazily so Three never lands in the initial bundle,
 * and the whole thing tears itself down when it leaves the screen.
 */
/**
 * Runs in two modes. Standalone (the `/lab/tether` route) draws its own HUD and
 * game-over card. Inside the feed it reports through `onFinish` and lets the
 * shared card chrome own the score, leaderboard and restart, exactly like the
 * other seven games.
 */
export function Tether({ active = true, onFinish, onRunningChange }: Partial<GameProps>) {
  const inFeed = Boolean(onFinish);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const renderer = useRef<import("./renderer").TetherRenderer | null>(null);
  // Seeded lazily inside an effect: Date.now() during render is impure.
  const world = useRef<TetherState>(createTetherState(1));
  const release = useRef(false);
  const [hud, setHud] = useState({ score: 0, combo: 0, height: 0, failed: false, started: false });
  const [best, setBest] = useState(0);
  const [muted, setMutedUi] = useState(true);
  const diedAt = useRef(0);
  const startedAt = useRef(0);
  const finish = useRef(onFinish);

  const reset = useCallback(() => {
    startedAt.current = Date.now();
    world.current = createTetherState(Math.floor(Math.random() * 100000) + 1);
    release.current = false;
    renderer.current?.reset();
    setHud({ score: 0, combo: 0, height: 0, failed: false, started: false });
  }, []);

  useEffect(() => { finish.current = onFinish; });
  useEffect(() => { onRunningChange?.(hud.started && !hud.failed); }, [hud.started, hud.failed, onRunningChange]);

  useEffect(() => {
    setBest(Number(localStorage.getItem("tether-best") ?? 0));
    setMutedUi(loadMutePreference());
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

        if (next.event === "release") { play("flip"); renderer.current?.punch(0.22); }
        if (next.event === "latch") play("score");
        if (next.event === "perfect") { play("combo"); renderer.current?.punch(0.6); }
        if (next.event === "decay") { play("power"); renderer.current?.punch(0.4); }
        if (next.event === "dead") {
          diedAt.current = now;
          finish.current?.({
            score: next.score,
            durationMs: Math.max(1000, Date.now() - startedAt.current),
            label: next.bestCombo >= 4 ? `PERFECT ×${next.bestCombo}` : `${Math.round(next.height * 10)} M CLIMBED`,
          });
          play("fail");
          renderer.current?.punch(1);
          setBest((current) => {
            const record = Math.max(current, next.score);
            localStorage.setItem("tether-best", String(record));
            return record;
          });
        }

        renderer.current?.render(next, dt);
        const height = Math.round(next.height * 10);
        const started = next.anchorId > 1 || next.phase !== "orbiting";
        setHud((current) =>
          current.score === next.score && current.combo === next.combo && current.height === height
            && current.failed === next.failed && current.started === started
            ? current
            : { score: next.score, combo: next.combo, height, failed: next.failed, started });
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
    if (world.current.failed) {
      // Read your score before you can restart, and never restart twice from the
      // button (which used to fire through the parent as well).
      if (performance.now() - diedAt.current > 650) reset();
      return;
    }
    if (!hud.started) startedAt.current = Date.now();
    release.current = true;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  };

  return (
    <div
      className="tether"
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        if (world.current.failed) { if (performance.now() - diedAt.current > 650) reset(); return; }
        release.current = true;
      }}
      role="button"
      tabIndex={0}
      aria-label="Tether — tap or press space to release"
    >
      <canvas ref={canvas} className="tether-canvas" />

      {!inFeed && <button type="button" className="tether-mute" aria-pressed={!muted}
        onPointerDown={(event) => { event.stopPropagation(); setMutedUi(setMuted(!isMuted())); }}>
        {muted ? "SOUND OFF" : "SOUND ON"}
      </button>}

      {!inFeed && <div className="tether-hud" aria-live="off" aria-hidden="true">
        <span className="tether-score" style={{ transform: `scale(${scoreScale(hud.score)})` }}>{scoreFormat.format(hud.score)}</span>
        <span className="tether-sub">{hud.height} M · BEST {scoreFormat.format(best)}</span>
        {hud.combo > 1 && <span className="tether-combo">PERFECT ×{hud.combo}</span>}
      </div>}

      {inFeed && (
        <div className="hud">
          <span>SCORE</span>
          <strong key={hud.score}>{String(hud.score).padStart(3, "0")}</strong>
          {hud.combo > 1 && <em className="combo">PERFECT ×{hud.combo}</em>}
        </div>
      )}

      {!hud.started && !hud.failed && (
        <div className="tether-coach">
          <span className="tether-coach-ring" />
          TAP TO LET GO
        </div>
      )}

      {hud.failed && !inFeed && (
        <div className="tether-over">
          <span>YOU FELL</span>
          <strong style={{ transform: `scale(${scoreScale(hud.score)})` }}>{scoreFormat.format(hud.score)}</strong>
          <em>{hud.height} M CLIMBED</em>
          <button type="button" onPointerDown={(event) => { event.stopPropagation(); if (performance.now() - diedAt.current > 650) reset(); }}>GO AGAIN</button>
        </div>
      )}
    </div>
  );
}
