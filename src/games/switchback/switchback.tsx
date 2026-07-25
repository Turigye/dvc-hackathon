"use client";

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "../types";
import { createSwitchbackState, step, type SwitchbackState } from "./simulation";

const hazards = Array.from({ length: 120 }, (_, segment) => ({
  segment,
  lane: (segment % 2) as 0 | 1,
  impactAt: 0.72,
}));

const freshState = () => createSwitchbackState({ seed: 17, hazards });

/** Plain-shape blockout. Art direction deliberately waits for the phone feel review. */
export function Switchback({ active, onFinish }: GameProps) {
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<SwitchbackState>(freshState);
  const state = useRef<SwitchbackState>(freshState());
  const finish = useRef(onFinish);
  const startedAt = useRef(0);

  useEffect(() => { finish.current = onFinish; }, [onFinish]);

  useEffect(() => {
    if (!running || !active) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const next = step(state.current, Math.min(64, now - previous), { flip: false });
      previous = now;
      state.current = next;
      setView(next);
      if (next.failed) {
        setRunning(false);
        finish.current({
          score: next.score + next.bonus,
          durationMs: Math.max(1_000, Date.now() - startedAt.current),
          label: next.failure === "hazard" ? "PISTON HIT" : "MISSED THE TURN",
        });
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, running]);

  useEffect(() => {
    if (active) return;
    const stop = window.setTimeout(() => setRunning(false), 0);
    return () => window.clearTimeout(stop);
  }, [active]);

  const flip = () => {
    if (!active) return;
    if (!running) {
      const initial = step(freshState(), 0, { flip: true });
      state.current = initial;
      setView(initial);
      startedAt.current = Date.now();
      setRunning(true);
      return;
    }
    const next = step(state.current, 0, { flip: true });
    state.current = next;
    setView(next);
  };

  const laneX = view.lane === 0 ? 30 : 70;
  const nextLaneX = view.lane === 0 ? 70 : 30;
  const runnerY = 78 - view.progress * 38;
  const hazard = view.hazards.find((item) => item.segment === view.segment && !item.resolved);
  const hazardY = hazard ? 78 - hazard.impactAt * 38 : -20;

  return (
    <button
      type="button"
      aria-label={running ? "Tap to flip at the next turn" : "Tap to start Switchback"}
      onPointerDown={(event) => { event.preventDefault(); flip(); }}
      className="stage"
      style={{ background: "#111", touchAction: "none" }}
    >
      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {[0, 1, 2, 3, 4].map((row) => <polyline key={row} points={row % 2 ? "30,12 70,30 30,48" : "70,12 30,30 70,48"} transform={`translate(0 ${row * 18})`} fill="none" stroke="#2d6cdf" strokeWidth="4" />)}
      </svg>
      {hazard && <i aria-hidden="true" style={{ position: "absolute", left: `${hazard.lane === 0 ? 22 : 62}%`, top: `${hazardY}%`, width: "16%", height: "7%", background: "#df3b32" }} />}
      <i aria-hidden="true" style={{ position: "absolute", left: `calc(${laneX}% - 16px)`, top: `calc(${runnerY}% - 16px)`, width: 32, height: 32, background: "#f6f6f6", borderRadius: "50%" }} />
      <i aria-hidden="true" style={{ position: "absolute", left: `calc(${nextLaneX}% - 3px)`, top: "39%", width: 6, height: 6, background: "#f6f6f6" }} />
      <div aria-live="polite" style={{ position: "absolute", top: 76, left: 18, color: "#fff", fontFamily: "monospace", fontSize: 16, pointerEvents: "none" }}>SCORE {view.score + view.bonus}</div>
      <div style={{ position: "absolute", bottom: 130, left: 0, right: 0, color: "#fff", fontFamily: "monospace", fontSize: 16, textAlign: "center", pointerEvents: "none" }}>{running ? "TAP TO FLIP" : "TAP TO START"}</div>
    </button>
  );
}
