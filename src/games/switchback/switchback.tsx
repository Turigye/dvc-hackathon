"use client";

import { ArrowFatDown, Coin, Lightning, PersonSimpleRun, ShieldCheck, Warning } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { GameProps } from "../types";
import { createSwitchbackState, step, type Lane, type RunnerEntity, type SwitchbackState } from "./simulation";
import styles from "./switchback.module.css";

const freshState = () => createSwitchbackState({ seed: 17 });

type StyleVars = CSSProperties & Record<`--${string}`, string | number>;

export function Switchback({ active, onFinish }: GameProps) {
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<SwitchbackState>(freshState);
  const state = useRef<SwitchbackState>(freshState());
  const finish = useRef(onFinish);
  const startedAt = useRef(0);
  const lastInputAt = useRef(-Infinity);

  useEffect(() => { finish.current = onFinish; }, [onFinish]);

  useEffect(() => {
    if (!running || !active) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const next = step(state.current, Math.min(64, now - previous), { move: 0 });
      previous = now;
      state.current = next;
      setView(next);
      if (next.failed) {
        setRunning(false);
        navigator.vibrate?.([24, 36, 48]);
        finish.current({
          score: next.score,
          durationMs: Math.max(1_000, Date.now() - startedAt.current),
          label: "ROADBLOCK HIT",
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

  const move = (direction: -1 | 1, source: "pointer" | "click" | "keyboard") => {
    if (!active) return;
    const now = performance.now();
    if (source === "click" && now - lastInputAt.current < 250) return;
    lastInputAt.current = now;

    if (!running) {
      const initial = step(freshState(), 0, { move: direction });
      state.current = initial;
      setView(initial);
      startedAt.current = Date.now();
      setRunning(true);
      navigator.vibrate?.(8);
      return;
    }

    const next = step(state.current, 0, { move: direction });
    state.current = next;
    setView(next);
    navigator.vibrate?.(5);
  };

  const onKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1, "keyboard");
  };

  const roadShift = (view.distance * 420) % 90;
  const runnerX = laneX(view.lane, 0.72);

  return (
    <div
      className={styles.stage}
      role="application"
      aria-label="Switchback. Tap the left or right side to steer between three lanes and avoid obstacles."
      onKeyDown={onKey}
      style={{ "--road-shift": `${roadShift}px` } as StyleVars}
    >
      <div className={styles.road} aria-hidden="true">
        <div className={styles.roadSurface} />
        <div className={`${styles.laneLine} ${styles.laneLineLeft}`} />
        <div className={`${styles.laneLine} ${styles.laneLineRight}`} />
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} className={styles.roadTick} style={{ "--tick": index } as StyleVars} />
        ))}
      </div>

      <div className={styles.hud} aria-live="polite">
        <span className={styles.high}>HI {Math.max(84, view.score).toString().padStart(3, "0")}</span>
        <strong data-testid="switchback-score">{view.score.toString().padStart(3, "0")}</strong>
      </div>

      <div className={styles.powerHud} aria-label="Power-up status">
        <span className={view.shieldCharges ? styles.powerActive : ""}><ShieldCheck weight="fill" /> {view.shieldCharges}</span>
        <span className={view.boostMs > 0 ? styles.boostActive : ""}><Lightning weight="fill" /> {view.boostMs > 0 ? "2X" : "—"}</span>
      </div>

      <div className={styles.entityLayer} aria-hidden="true">
        {view.entities.map((entity) => <GameEntity key={entity.id} entity={entity} />)}
      </div>

      <div
        className={`${styles.runner} ${view.boostMs > 0 ? styles.runnerBoost : ""} ${view.shieldCharges ? styles.runnerShield : ""}`}
        style={{ left: `${runnerX}%`, "--lean": `${view.lane * 9}deg` } as StyleVars}
        aria-hidden="true"
      >
        <PersonSimpleRun weight="fill" />
      </div>

      {view.event && (
        <div key={view.eventNonce} className={styles.event} aria-live="polite">
          {eventLabel(view.event)}
        </div>
      )}

      {!running && !view.failed && (
        <div className={styles.instructions}>
          <b>RUN THE BLUE</b>
          <span>Tap left or right to change lanes.</span>
          <span>Avoid red. Collect amber and cobalt.</span>
          <div className={styles.controlDiagram}><span>← LEFT</span><span>RIGHT →</span></div>
        </div>
      )}

      <button
        type="button"
        className={`${styles.control} ${styles.controlLeft}`}
        aria-label={running ? "Move one lane left" : "Start and move left"}
        onPointerDown={(event) => { event.preventDefault(); move(-1, "pointer"); }}
        onClick={() => move(-1, "click")}
      />
      <button
        type="button"
        className={`${styles.control} ${styles.controlRight}`}
        aria-label={running ? "Move one lane right" : "Start and move right"}
        onPointerDown={(event) => { event.preventDefault(); move(1, "pointer"); }}
        onClick={() => move(1, "click")}
      />
    </div>
  );
}

function GameEntity({ entity }: { entity: RunnerEntity }) {
  const x = laneX(entity.lane, entity.y);
  const scale = Math.max(0.55, Math.min(1.28, 0.62 + entity.y * 0.78));
  const style = { left: `${x}%`, top: `${entity.y * 100}%`, "--entity-scale": scale } as StyleVars;

  if (entity.kind === "piston") {
    return <div className={`${styles.entity} ${styles.piston}`} style={style}><i /><ArrowFatDown weight="fill" /></div>;
  }
  if (entity.kind === "spikes") {
    return <div className={`${styles.entity} ${styles.spikes}`} style={style}><Warning weight="fill" /></div>;
  }
  if (entity.kind === "shield") {
    return <div className={`${styles.entity} ${styles.pickup} ${styles.shield}`} style={style}><ShieldCheck weight="fill" /></div>;
  }
  if (entity.kind === "boost") {
    return <div className={`${styles.entity} ${styles.pickup} ${styles.boost}`} style={style}><Lightning weight="fill" /></div>;
  }
  return <div className={`${styles.entity} ${styles.pickup} ${styles.coin}`} style={style}><Coin weight="fill" /></div>;
}

function laneX(lane: Lane, y: number) {
  return 50 + lane * (10 + Math.max(0, y) * 11);
}

function eventLabel(event: NonNullable<SwitchbackState["event"]>) {
  if (event === "shield") return "SHIELD UP";
  if (event === "boost") return "BOOST 2X";
  if (event === "coin") return "+5";
  if (event === "smash") return "SMASH +3";
  return "SHIELD SAVE";
}
