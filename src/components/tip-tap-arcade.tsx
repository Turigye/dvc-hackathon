"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity -- game engines intentionally update state from browser lifecycles and input handlers. */

import { ArrowDown, ArrowSquareOut, GoogleLogo, SpeakerHigh, SpeakerSlash, Trophy } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { games, type GameSlug } from "@/lib/games";
import type { LeaderboardResponse } from "@/lib/score-store";

type GameResult = { score: number; durationMs: number; label: string };
type Finish = (result: GameResult) => void;
const EMPTY_BOARD: LeaderboardResponse = { entries: [], playerRank: null, percentile: 0, playerBest: 0 };
const getDeviceId = () => {
  const key = "tip-tap-device-v1";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
};

export function TipTapArcade() {
  const [active, setActive] = useState<GameSlug>("burn-in");
  const [deviceId, setDeviceId] = useState("");
  const [muted, setMuted] = useState(true);
  const [boards, setBoards] = useState<Record<GameSlug, LeaderboardResponse>>({ "burn-in": EMPTY_BOARD, "lcd-run": EMPTY_BOARD, "signal-lock": EMPTY_BOARD });
  const [result, setResult] = useState<{ game: GameSlug; data: GameResult } | null>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => { setDeviceId(getDeviceId()); }, []);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const top = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const slug = top?.target.getAttribute("data-game");
      if (slug && games.some((game) => game.slug === slug)) { setActive(slug as GameSlug); setResult(null); }
    }, { threshold: [0.55, 0.75] });
    cards.current.forEach((card) => card && observer.observe(card));
    return () => observer.disconnect();
  }, []);

  const loadBoard = useCallback(async (game: GameSlug) => {
    if (!deviceId) return;
    const response = await fetch(`/api/leaderboard?game=${game}&device=${deviceId}`, { cache: "no-store" });
    if (response.ok) { const board = await response.json() as LeaderboardResponse; setBoards((current) => ({ ...current, [game]: board })); }
  }, [deviceId]);
  useEffect(() => { void loadBoard(active); const id = window.setInterval(() => void loadBoard(active), 7000); return () => clearInterval(id); }, [active, loadBoard]);

  const submit = useCallback(async (game: GameSlug, data: GameResult) => {
    if (!deviceId) return;
    setResult({ game, data });
    await fetch("/api/scores", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game, score: data.score, durationMs: data.durationMs, roundId: crypto.randomUUID(), deviceId }) });
    await loadBoard(game);
  }, [deviceId, loadBoard]);
  const share = async () => { const url = new URL(location.href); url.searchParams.set("game", active); url.searchParams.set("beat", String(result?.data.score ?? boards[active].playerBest)); await navigator.clipboard?.writeText(url.toString()); };

  return <main className="arcade-shell">
    <header className="arcade-header"><a className="wordmark" href="#burn-in" aria-label="Tip Tap Games"><span>TIP</span><span>TAP</span><i>GAMES</i></a><div className="header-actions"><span className="feed-count">{games.findIndex((game) => game.slug === active) + 1} / 3</span><button className="icon-button" type="button" aria-label={muted ? "Turn sound on" : "Turn sound off"} onClick={() => setMuted((value) => !value)}>{muted ? <SpeakerSlash weight="bold" /> : <SpeakerHigh weight="bold" />}</button></div></header>
    <div className="game-feed" aria-label="Tip Tap game feed">{games.map((game, index) => <section key={game.slug} ref={(element) => { cards.current[index] = element; }} id={game.slug} data-game={game.slug} className={`game-card ${game.accent} ${active === game.slug ? "is-active" : ""}`} aria-label={`${game.title} game`}>
      <div className="game-topline"><span>{game.kicker}</span><span>HI {boards[game.slug].playerBest || "---"}</span></div><h1>{game.title}</h1><div className="game-layout"><div className="game-stage">
        {game.slug === "burn-in" && <BurnIn active={active === game.slug} onFinish={(data) => void submit(game.slug, data)} />}
        {game.slug === "lcd-run" && <LcdRun active={active === game.slug} onFinish={(data) => void submit(game.slug, data)} />}
        {game.slug === "signal-lock" && <SignalLock active={active === game.slug} onFinish={(data) => void submit(game.slug, data)} />}
      </div><Leaderboard board={boards[game.slug]} game={game.title} /></div>
      {result?.game === game.slug && <ResultCard result={result.data} board={boards[game.slug]} deviceId={deviceId} onShare={() => void share()} />}
      <div className="swipe-cue" aria-hidden="true"><ArrowDown weight="bold" /><span>{index === games.length - 1 ? "LOOP BACK" : "NEXT GAME"}</span></div>
    </section>)}</div></main>;
}

function Leaderboard({ board, game }: { board: LeaderboardResponse; game: string }) { return <aside className="leaderboard" aria-label={`${game} leaderboard`}><div className="leaderboard-heading"><Trophy weight="fill" /><span>HI-SCORES</span></div>{board.entries.length ? board.entries.slice(0, 5).map((entry) => <div className={`rank-row ${entry.isYou ? "is-you" : ""}`} key={`${entry.rank}-${entry.player}`}><span>{String(entry.rank).padStart(2, "0")}</span><b>{entry.player}</b><strong>{entry.score}</strong></div>) : <p>BOARD BOOTING…</p>}</aside>; }
function ResultCard({ result, board, onShare, deviceId }: { result: GameResult; board: LeaderboardResponse; onShare: () => void; deviceId: string }) { const save = result.score >= Math.max(20, board.playerBest); return <section className="result-card" aria-live="polite"><div><span>GAME OVER</span><h2>{result.label}</h2><p>{board.percentile ? `YOU BEAT ${board.percentile}% OF PLAYERS.` : "SCORE RECORDED."}</p></div><div className="result-actions">{save && <a className="save-score" href={`/auth/login?device=${deviceId}`}><GoogleLogo weight="fill" />KEEP THIS SCORE</a>}<button className="share-button" type="button" onClick={onShare}><ArrowSquareOut weight="bold" />CHALLENGE A FRIEND</button></div></section>; }

function BurnIn({ active, onFinish }: { active: boolean; onFinish: Finish }) {
  const [sequence, setSequence] = useState<number[]>([]); const [input, setInput] = useState(0); const [flash, setFlash] = useState<number | null>(null); const [phase, setPhase] = useState<"idle" | "show" | "play">("idle"); const timers = useRef<number[]>([]); const started = useRef(0);
  const finish = useRef(onFinish); useEffect(() => { finish.current = onFinish; });
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const show = useCallback((next: number[]) => { clear(); setSequence(next); setInput(0); setPhase("show"); const decay = Math.max(260, 900 - (next.length - 1) * 75); next.forEach((cell, i) => { timers.current.push(window.setTimeout(() => setFlash(cell), 260 + i * (decay + 130))); timers.current.push(window.setTimeout(() => setFlash(null), 260 + i * (decay + 130) + decay)); }); timers.current.push(window.setTimeout(() => setPhase("play"), 390 + next.length * (decay + 130))); }, []);
  useEffect(() => () => clear(), []); useEffect(() => { if (!active) { clear(); setPhase("idle"); } }, [active]);
  const press = (cell: number) => { if (!active) return; if (phase === "idle") { started.current = Date.now(); show([Math.floor(Math.random() * 9)]); return; } if (phase !== "play") return; if (sequence[input] !== cell) { const score = Math.max(0, (sequence.length - 1) ** 2 * 10); setPhase("idle"); finish.current({ score, durationMs: Math.max(1000, Date.now() - started.current), label: `LEVEL ${Math.max(1, sequence.length - 1)}` }); return; } if (input + 1 === sequence.length) show([...sequence, Math.floor(Math.random() * (sequence.length >= 5 ? 16 : 9))]); else setInput((value) => value + 1); };
  const count = sequence.length >= 5 ? 16 : 9; return <div className="blink-board"><div className="blink-copy"><span>RECALL</span><strong>{sequence.length || "-"}</strong><p>{phase === "idle" ? "TOUCH GRID" : phase === "show" ? "BURNING…" : "REPEAT"}</p></div><div className={`tile-grid burn-grid ${count === 16 ? "four" : ""}`}>{Array.from({ length: count }, (_, cell) => <button key={cell} type="button" onClick={() => press(cell)} className={`memory-tile ${flash === cell ? "is-flashing" : ""}`} aria-label={`Memory cell ${cell + 1}`} />)}</div></div>;
}

function LcdRun({ active, onFinish }: { active: boolean; onFinish: Finish }) {
  const [lane, setLane] = useState(1); const [obstacles, setObstacles] = useState<{ lane: number; row: number }[]>([]); const [score, setScore] = useState(0); const [running, setRunning] = useState(false); const state = useRef({ lane: 1, score: 0, start: 0, obstacles: [] as { lane: number; row: number }[] });
  const finish = useRef(onFinish); useEffect(() => { finish.current = onFinish; });
  useEffect(() => { if (!running || !active) return; let id = 0; const tick = () => { const current = state.current; const moved = current.obstacles.map((item) => ({ ...item, row: item.row + 1 })).filter((item) => item.row <= 5); if (moved.some((item) => item.row === 5 && item.lane === current.lane)) { setRunning(false); finish.current({ score: current.score, durationMs: Math.max(1000, Date.now() - current.start), label: "CRASHED" }); return; } const nextScore = current.score + 1; const density = nextScore > 30 ? 2 : 1; const blocked = new Set(moved.filter((item) => item.row === 0).map((item) => item.lane)); const open = [0, 1, 2].filter((value) => !blocked.has(value)); const reachable = new Set([current.lane, (current.lane + 1) % 3]); const spare = open.find((value) => reachable.has(value)) ?? open[0]; const incoming = Math.random() < .72 ? Array.from({ length: density }, (_, index) => ({ lane: (Math.floor(Math.random() * 3) + index) % 3, row: 0 })).filter((item) => item.lane !== spare) : []; current.obstacles = [...moved, ...incoming]; current.score = nextScore; setObstacles(current.obstacles); setScore(nextScore); id = window.setTimeout(tick, Math.max(180, 520 - nextScore * 7)); }; id = window.setTimeout(tick, 520); return () => clearTimeout(id); }, [active, running]);
  useEffect(() => { if (!active) setRunning(false); }, [active]);
  const switchLane = () => { if (!active) return; if (!running) { state.current = { lane: 1, score: 0, start: Date.now(), obstacles: [] }; setLane(1); setScore(0); setObstacles([]); setRunning(true); return; } const next = (state.current.lane + 1) % 3; state.current.lane = next; setLane(next); };
  return <button type="button" className="slip-board lcd-board" onClick={switchLane} aria-label="Tap to switch lanes"><div className="slip-score"><span>TICKS</span><strong>{score}</strong></div><div className="course lcd-course">{Array.from({ length: 3 }, (_, index) => <i key={index} className={`lane lane-${index}`} />)}{obstacles.map((item, index) => <i key={`${index}-${item.row}-${item.lane}`} className="hazard lcd-obstacle" style={{ left: `${item.lane * 33.333}%`, top: `${item.row * 18}%` }} />)}<i className="runner lcd-runner" style={{ left: `${lane * 33.333 + 16.667}%` }} /></div><div className="board-action">{running ? "TAP TO SWITCH" : "TAP TO RUN"}</div></button>;
}

function SignalLock({ active, onFinish }: { active: boolean; onFinish: Finish }) {
  const [tuner, setTuner] = useState(50); const [target, setTarget] = useState(48); const [score, setScore] = useState(0); const [meter, setMeter] = useState(100); const [live, setLive] = useState(false); const start = useRef(0); const hold = useRef(0); const values = useRef({ tuner: 50, target: 48, score: 0, meter: 100 });
  const finish = useRef(onFinish); useEffect(() => { finish.current = onFinish; });
  useEffect(() => { if (!live || !active) return; let frame = 0; let previous = performance.now(); const step = (now: number) => { const dt = Math.min(120, now - previous); previous = now; const current = values.current; const width = Math.max(6, 18 - current.score / 350); current.target = Math.max(width / 2, Math.min(100 - width / 2, current.target + Math.sin(now / 700) * dt * (.012 + current.score / 90000))); const locked = Math.abs(current.tuner - current.target) <= width / 2; if (locked) { hold.current += dt; current.score += (hold.current > 3000 ? 2 : 1) * dt / 100; current.meter = Math.min(100, current.meter + dt / 140); } else { hold.current = 0; current.meter -= dt / 65; } values.current = current; setTarget(current.target); setScore(Math.floor(current.score)); setMeter(current.meter); if (current.meter <= 0) { setLive(false); finish.current({ score: Math.floor(current.score), durationMs: Math.max(1000, Date.now() - start.current), label: "SIGNAL LOST" }); return; } frame = requestAnimationFrame(step); }; frame = requestAnimationFrame(step); return () => cancelAnimationFrame(frame); }, [active, live]);
  useEffect(() => { if (!active) setLive(false); }, [active]);
  const move = (event: React.PointerEvent<HTMLDivElement>) => { const rect = event.currentTarget.getBoundingClientRect(); const next = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)); if (!live) { start.current = Date.now(); hold.current = 0; values.current = { tuner: next, target: 48, score: 0, meter: 100 }; setScore(0); setMeter(100); setLive(true); } values.current.tuner = next; setTuner(next); };
  const nudge = (delta: number) => { const next = Math.max(0, Math.min(100, values.current.tuner + delta)); values.current.tuner = next; setTuner(next); if (!live) { start.current = Date.now(); hold.current = 0; values.current = { tuner: next, target: 48, score: 0, meter: 100 }; setLive(true); } };
  const zone = Math.max(6, 18 - score / 350);
  return <div className={`beat-board signal-board ${live && Math.abs(tuner - target) <= zone / 2 ? "is-locked" : ""}`}><div className="score-stack"><span>LOCK</span><strong>{score}</strong><span>POWER <b>{Math.max(0, Math.round(meter))}%</b></span></div><div className="timing-rail signal-rail" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); move(event); }} onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && move(event)} role="slider" tabIndex={0} aria-label="Drag to tune the signal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(tuner)} onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); nudge(-4); } if (event.key === "ArrowDown") { event.preventDefault(); nudge(4); } }}><div className="target-zone" style={{ top: `${target - zone / 2}%`, height: `${zone}%` }} /><div className="marker" style={{ top: `${tuner}%` }} /></div><div className="board-action">{live ? "HOLD THE SIGNAL" : "DRAG TO LOCK"}</div></div>;
}
