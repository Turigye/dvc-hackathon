"use client";
/* eslint-disable react-hooks/set-state-in-effect -- rAF owns the simulation snapshot. */
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "./types";
import { play } from "@/lib/audio";
import { Bursts, useBursts } from "@/components/burst";
import { GameArt } from "@/components/game-art";
import { createSwarmState, stepSwarm, tapSwarm, type SwarmState } from "./swarm-simulation";

export function Swarm({ active, onFinish, onRunningChange }: GameProps) {
  const [state, setState] = useState<SwarmState>(() => createSwarmState({ spawnEnabled: false }));
  const [running, setRunning] = useState(false);
  const world = useRef(state); const started = useRef(0); const finish = useRef(onFinish);
  const { bursts, fire } = useBursts();
  useEffect(() => { finish.current = onFinish; });
  useEffect(() => { onRunningChange?.(running); }, [running, onRunningChange]);

  useEffect(() => {
    if (!running || !active) return;
    let frame = 0; let previous = performance.now();
    const loop = (now: number) => {
      const next = stepSwarm(world.current, Math.min(64, now - previous)); previous = now; world.current = next; setState(next);
      if (next.failed) {
        setRunning(false); play("fail");
        finish.current({ score: next.score, durationMs: Math.max(1000, Date.now() - started.current), label: next.failure === "predator" ? "RED TAPPED" : "3 ESCAPED" });
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop); return () => cancelAnimationFrame(frame);
  }, [running, active]);
  useEffect(() => { if (!active) setRunning(false); }, [active]);

  const tap = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    if (!running) {
      const fresh = createSwarmState({ seed: (Date.now() % 100000) + 1 }); world.current = fresh; setState(fresh);
      started.current = Date.now(); setRunning(true); return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100; const y = ((event.clientY - rect.top) / rect.height) * 100;
    const next = tapSwarm(world.current, x, y, rect.height / rect.width);
    if (next.event === "predator") { fire(x, y, "fail"); play("fail"); }
    else if (next.event === "queen-hit" || next.event === "queen-defeat") { fire(x, y, "power"); play("power"); }
    else if (next.event === "prey") { fire(x, y, "score"); play("pickup"); }
    world.current = next; setState(next);
    if (next.failed) {
      setRunning(false);
      finish.current({ score: next.score, durationMs: Math.max(1000, Date.now() - started.current), label: "RED TAPPED" });
    } else if (next.event && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(next.event === "queen-defeat" ? [20, 35, 30] : 7);
  };

  return (
    <div className="stage swarm-stage" data-running={running ? "true" : "false"} onPointerDown={tap} role="button" tabIndex={0} aria-label={running ? "Tap pale bugs, avoid red bugs, fill Bloom and defeat the Queen" : "Tap to start Swarm"}>
      <div className="hud"><span>SCORE</span><strong key={state.score}>{String(state.score).padStart(3, "0")}</strong></div>
      <div className="swarm-status">
        <span className="bloom-label">BLOOM</span><span className="bloom-meter" aria-label={`${state.bloom} of 5 Bloom`}>
          {[0,1,2,3,4].map((index) => <i key={index} className={index < state.bloom ? "is-full" : ""} />)}
        </span>
        <span className="lives" aria-label={`${state.lives} lives left`}>{[0,1,2].map((index) => <i key={index} className={index < state.lives ? "life" : "life is-lost"} />)}</span>
      </div>
      {state.bugs.map((bug) => (
        <i key={bug.id} className={`bug is-${bug.kind} ${(bug.invulnerableMs ?? 0) > 0 ? "is-shielded" : ""}`} style={{ left: `${bug.x}%`, top: `${bug.y}%` }}>
          <GameArt active={active} className="swarm-bug-art" src={bug.kind === "queen" ? "/assets/games/swarm/sprite-queen-v2.png" : bug.kind === "predator" ? "/assets/games/swarm/sprite-bug-predator-v2.png" : `/assets/games/swarm/sprite-bug-${["cyan","pink","lavender","violet"][bug.id % 4]}-v2.png`} />
          {bug.kind === "queen" && <span className="queen-health">{[0,1,2].map((petal) => <b key={petal} className={petal < (bug.health ?? 3) ? "" : "is-gone"} />)}</span>}
        </i>
      ))}
      <Bursts bursts={bursts} />
      <div className="prompt">{running ? (state.bugs.some((bug) => bug.kind === "queen") ? "BREAK 3 PETALS" : "PALE = CATCH · RED = DANGER") : "TAP TO START"}</div>
    </div>
  );
}
