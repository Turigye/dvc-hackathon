"use client";
/* eslint-disable react-hooks/set-state-in-effect -- the game loop drives state from rAF. */

import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";
import { play } from "@/lib/audio";
import { Bursts, useBursts } from "@/components/burst";
import { GameArt } from "@/components/game-art";

/**
 * OVERLOAD — press and hold to charge the core, release before it blows.
 * The target band moves and narrows each round. Release short and you score
 * little; release late and the run ends. Rule: `Hold. Release in the band.`
 *
 * Input model is press-and-hold — deliberately different from every other
 * game in the feed, per the care package's interaction-variety guidance.
 */

const START_BAND = 26;
const MIN_BAND = 9;

export function Overload({ active, onFinish, onRunningChange }: GameProps) {
  const [charge, setCharge] = useState(0);
  const [band, setBand] = useState({ at: 62, width: START_BAND });
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [state, setState] = useState<"idle" | "charging" | "blown">("idle");
  const world = useRef({ charge: 0, rate: 46, at: 62, width: START_BAND, score: 0, streak: 0, start: 0, drift: 0, base: 62 });
  const holding = useRef(false);
  const { bursts, fire } = useBursts();
  const finish = useRef(onFinish);
  useEffect(() => { finish.current = onFinish; });
  useEffect(() => { onRunningChange?.(state === "charging"); }, [state, onRunningChange]);

  useEffect(() => {
    if (state !== "charging" || !active) return;
    let frame = 0;
    let previous = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - previous) / 1000;
      previous = now;
      const w = world.current;
      // Uncapped difficulty axis. Rate and band both bottom out around release
      // 13, after which the game used to be identical forever; the band now
      // sways faster the longer the streak runs, so precision keeps mattering.
      if (w.streak > 4) {
        w.drift += dt * (0.7 + w.streak * 0.09);
        w.at = w.base + Math.sin(w.drift) * Math.min(16, (w.streak - 4) * 1.5);
        setBand({ at: w.at, width: w.width });
      }
      if (holding.current) w.charge += w.rate * dt;
      else w.charge = Math.max(0, w.charge - w.rate * 1.6 * dt);
      if (w.charge > 100) {
        setState("blown");
        finish.current({ score: w.score, durationMs: Math.max(1000, Date.now() - w.start), label: w.streak >= 6 ? `STREAK ${w.streak}` : "OVERLOADED" });
        return;
      }
      setCharge(w.charge);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state, active]);

  useEffect(() => { if (!active) { setState("idle"); holding.current = false; } }, [active]);

  const press = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!active) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (state !== "charging") {
      world.current = { charge: 0, rate: 46, at: 62, width: START_BAND, score: 0, streak: 0, start: Date.now(), drift: 0, base: 62 };
      setCharge(0); setBand({ at: 62, width: START_BAND }); setScore(0); setStreak(0); setState("charging");
    }
    holding.current = true;
  };

  const release = (event?: React.PointerEvent<HTMLButtonElement>) => {
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    holding.current = false;
    if (!active || state !== "charging") return;
    const w = world.current;
    const low = w.at - w.width / 2;
    const high = w.at + w.width / 2;
    if (w.charge < low) {
      w.streak = 0;
      setStreak(0);
      return; // Undercharged: no score, but the core survives. Try again.
    }
    if (w.charge > high) {
      // Overcharging is a gamble, not a certainty. Just past the band it can
      // supercharge instead — so greed is a real decision, not a mistake.
      const margin = w.charge - high;
      if (margin < 6 && Math.random() < 0.4) {
        fire(50, 100 - w.at, "power");
        play("best");
        w.streak += 1;
        w.score += 60;
        w.charge = 0;
        setScore(w.score); setStreak(w.streak); setCharge(0);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([12, 40, 12]);
        return;
      }
      setState("blown");
      finish.current({ score: w.score, durationMs: Math.max(1000, Date.now() - w.start), label: "OVERLOADED" });
      return;
    }
    fire(50, 100 - w.at, "score");
    play("score");
    const accuracy = 1 - Math.abs(w.charge - w.at) / (w.width / 2);
    w.streak += 1;
    w.score += Math.round(10 + accuracy * 20) * Math.min(4, w.streak);
    w.width = Math.max(MIN_BAND, w.width - 2);
    w.rate = Math.min(120, w.rate + 6);
    w.base = 34 + Math.random() * 52;
    w.at = w.base;
    w.charge = 0;
    setScore(w.score); setStreak(w.streak); setBand({ at: w.at, width: w.width }); setCharge(0);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(10);
  };

  const cancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    holding.current = false;
  };

  return (
    <button
      type="button"
      className="stage overload-stage"
      data-running={state === "charging" ? "true" : "false"}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={cancel}
      aria-label={state === "charging" ? "Release inside the band" : "Press and hold to start Overload"}
    >
      <div className="hud"><span>SCORE</span><strong key={score}>{String(score).padStart(3, "0")}</strong>{streak > 1 && <em className="combo">STREAK ×{streak}</em>}</div>
      <div className="core-track">
        <i className="core-band" style={{ bottom: `${band.at - band.width / 2}%`, height: `${band.width}%` }} />
        <i className="core-fill" style={{ height: `${Math.min(100, charge)}%` }} />
        <GameArt active={active} className="core-emblem-art" src={`/assets/games/overload/sprite-core-${charge > band.at + band.width / 2 || state === "blown" ? "overcharged" : "calm"}-v2.png`} />
      </div>
      <GameArt active={active} className="overload-operator-art" src="/assets/games/overload/sprite-operator-v2.png" />
      <Bursts bursts={bursts} />
      <div className="prompt">{state === "charging" ? "RELEASE IN THE BAND" : "HOLD TO CHARGE"}</div>
    </button>
  );
}
