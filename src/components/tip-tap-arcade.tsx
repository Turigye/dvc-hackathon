"use client";

import { ArrowDown, ArrowSquareOut, GoogleLogo, Play, SpeakerHigh, SpeakerSlash, Trophy } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { games, type GameSlug } from "@/lib/games";
import type { LeaderboardResponse } from "@/lib/score-store";

type GameResult = { score: number; durationMs: number; label: string };

const getDeviceId = () => {
  const key = "tip-tap-device-v1";
  const current = localStorage.getItem(key);
  if (current) return current;
  const next = crypto.randomUUID();
  localStorage.setItem(key, next);
  return next;
};

const initialBoard: LeaderboardResponse = { entries: [], playerRank: null, percentile: 0, playerBest: 0 };

export function TipTapArcade() {
  const [active, setActive] = useState<GameSlug>("beat-drop");
  const [deviceId, setDeviceId] = useState("");
  const [muted, setMuted] = useState(true);
  const [leaderboard, setLeaderboard] = useState(initialBoard);
  const [result, setResult] = useState<GameResult | null>(null);
  const cardsRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => setDeviceId(getDeviceId()), []);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const top = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const slug = top?.target.getAttribute("data-game") as GameSlug | null;
      if (slug) { setActive(slug); setResult(null); }
    }, { threshold: [0.55, 0.75] });
    cardsRef.current.forEach((card) => card && observer.observe(card));
    return () => observer.disconnect();
  }, []);

  const loadLeaderboard = useCallback(async (game: GameSlug) => {
    if (!deviceId) return;
    const response = await fetch(`/api/leaderboard?game=${game}&device=${deviceId}`, { cache: "no-store" });
    if (response.ok) setLeaderboard(await response.json());
  }, [deviceId]);

  useEffect(() => {
    void loadLeaderboard(active);
    const poll = window.setInterval(() => void loadLeaderboard(active), 7000);
    return () => window.clearInterval(poll);
  }, [active, loadLeaderboard]);

  const submit = useCallback(async (game: GameSlug, nextResult: GameResult) => {
    if (!deviceId) return;
    setResult(nextResult);
    await fetch("/api/scores", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ game, score: nextResult.score, durationMs: nextResult.durationMs, roundId: crypto.randomUUID(), deviceId }),
    });
    await loadLeaderboard(game);
  }, [deviceId, loadLeaderboard]);

  const share = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("game", active);
    url.searchParams.set("beat", String(result?.score ?? leaderboard.playerBest));
    await navigator.clipboard?.writeText(url.toString());
  };

  return (
    <main className="arcade-shell">
      <header className="arcade-header">
        <a className="wordmark" href="#beat-drop" aria-label="Tip Tap Games — return to first game"><span>TIP</span><span>TAP</span><i>GAMES</i></a>
        <div className="header-actions">
          <span className="feed-count" aria-live="polite">{games.findIndex((game) => game.slug === active) + 1} / 3</span>
          <button className="icon-button" type="button" aria-label={muted ? "Turn sound on" : "Turn sound off"} onClick={() => setMuted(!muted)}>{muted ? <SpeakerSlash weight="bold" /> : <SpeakerHigh weight="bold" />}</button>
        </div>
      </header>

      <div className="game-feed" aria-label="Tip Tap game feed">
        {games.map((game, index) => (
          <section key={game.slug} ref={(element) => { cardsRef.current[index] = element; }} id={game.slug} data-game={game.slug} className={`game-card ${game.accent} ${active === game.slug ? "is-active" : ""}`} aria-label={`${game.title} game`}>
            <div className="game-topline"><span>{game.kicker}</span><span>{game.duration} SEC</span></div>
            <h1>{game.title}</h1>
            <div className="game-layout">
              <div className="game-stage">
                {game.slug === "beat-drop" && <BeatDrop active={active === game.slug} onFinish={(next) => void submit(game.slug, next)} />}
                {game.slug === "slipstream" && <Slipstream active={active === game.slug} onFinish={(next) => void submit(game.slug, next)} />}
                {game.slug === "blinkstack" && <Blinkstack active={active === game.slug} onFinish={(next) => void submit(game.slug, next)} />}
              </div>
              <Leaderboard board={leaderboard} game={game.title} />
            </div>
            {result && active === game.slug && <ResultCard result={result} board={leaderboard} onShare={() => void share()} />}
            <div className="swipe-cue" aria-hidden="true"><ArrowDown weight="bold" /> <span>{index === games.length - 1 ? "SWIPE UP" : "NEXT GAME"}</span></div>
          </section>
        ))}
      </div>
    </main>
  );
}

function Leaderboard({ board, game }: { board: LeaderboardResponse; game: string }) {
  return <aside className="leaderboard" aria-label={`${game} leaderboard`}><div className="leaderboard-heading"><Trophy weight="fill" /> <span>TOP PLAYERS</span></div>{board.entries.length ? board.entries.slice(0, 5).map((entry) => <div className={`rank-row ${entry.isYou ? "is-you" : ""}`} key={`${entry.rank}-${entry.player}`}><span>{String(entry.rank).padStart(2, "0")}</span><b>{entry.player}</b><strong>{entry.score}</strong></div>) : <p>Loading the board…</p>}</aside>;
}

function ResultCard({ result, board, onShare }: { result: GameResult; board: LeaderboardResponse; onShare: () => void }) {
  const isWorthSaving = result.score >= Math.max(80, board.playerBest);
  return <section className="result-card" aria-live="polite"><div><span>ROUND COMPLETE</span><h2>{result.label}</h2><p>{board.percentile ? `You beat ${board.percentile}% of players.` : "Your score is now on the board."}</p></div><div className="result-actions">{isWorthSaving && <a className="save-score" href="/auth/login"><GoogleLogo weight="fill" /> KEEP THIS SCORE</a>}<button type="button" className="share-button" onClick={onShare}><ArrowSquareOut weight="bold" /> CHALLENGE A FRIEND</button></div></section>;
}

function BeatDrop({ active, onFinish }: { active: boolean; onFinish: (result: GameResult) => void }) {
  const [started, setStarted] = useState(false); const [elapsed, setElapsed] = useState(0); const [score, setScore] = useState(0); const [streak, setStreak] = useState(0); const startAt = useRef(0);
  useEffect(() => { if (!active) setStarted(false); }, [active]);
  useEffect(() => { if (!started) return; let frame = 0; const tick = () => { const ms = Date.now() - startAt.current; setElapsed(ms); if (ms >= 30_000) { setStarted(false); onFinish({ score, durationMs: ms, label: score > 700 ? "ON FIRE" : "ON THE BOARD" }); return; } frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [started, score, onFinish]);
  const marker = ((elapsed % 1800) / 1800) * 100;
  const tap = () => { if (!started) { startAt.current = Date.now(); setScore(0); setStreak(0); setStarted(true); return; } const accuracy = Math.max(0, 1 - Math.abs(marker - 52) / 18); const points = Math.round(accuracy * 100); setScore((value) => value + points + streak * 5); setStreak((value) => points > 30 ? value + 1 : 0); };
  return <button type="button" className="beat-board" onClick={tap} aria-label={started ? "Tap to hit the moving target" : "Start Beat Drop"}><div className="score-stack"><span>SCORE</span><strong>{score}</strong><span>STREAK <b>{String(streak).padStart(2, "0")}</b></span></div><div className="timing-rail"><div className="target-zone"><i /></div><div className="marker" style={{ top: `${marker}%` }} /></div><div className="board-action"><Play weight="fill" /> {started ? "TAP THE BEAT" : "TAP TO PLAY"}</div><div className="round-timer">{Math.max(0, 30 - Math.floor(elapsed / 1000))}</div></button>;
}

function Slipstream({ active, onFinish }: { active: boolean; onFinish: (result: GameResult) => void }) {
  const [started, setStarted] = useState(false); const [runner, setRunner] = useState(50); const [seconds, setSeconds] = useState(20); const startAt = useRef(0); const runnerRef = useRef(50);
  useEffect(() => { if (!active) setStarted(false); }, [active]);
  useEffect(() => { if (!started) return; const interval = window.setInterval(() => { const elapsed = Date.now() - startAt.current; const left = Math.max(0, 20 - elapsed / 1000); setSeconds(left); if (elapsed >= 20_000) { window.clearInterval(interval); setStarted(false); onFinish({ score: 1200 + Math.round(runnerRef.current * 4), durationMs: elapsed, label: "CLEAN RUN" }); } }, 80); return () => window.clearInterval(interval); }, [started, onFinish]);
  const move = (event: React.PointerEvent<HTMLButtonElement>) => { const rect = event.currentTarget.getBoundingClientRect(); const x = Math.max(10, Math.min(90, ((event.clientX - rect.left) / rect.width) * 100)); runnerRef.current = x; setRunner(x); };
  const start = () => { startAt.current = Date.now(); setSeconds(20); setStarted(true); };
  return <button type="button" className="slip-board" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); if (!started) start(); move(event); }} onPointerMove={(event) => started && move(event)} aria-label={started ? "Drag to steer through the course" : "Start Slipstream"}><div className="slip-score"><span>SURVIVE</span><strong>{seconds.toFixed(1)}</strong></div><div className="course"><i className="hazard h-one" /><i className="hazard h-two" /><i className="hazard h-three" /><i className="runner" style={{ left: `${runner}%` }} /></div><div className="board-action">{started ? "DRAG TO STEER" : "PRESS + DRAG"}</div></button>;
}

function Blinkstack({ active, onFinish }: { active: boolean; onFinish: (result: GameResult) => void }) {
  const [sequence, setSequence] = useState<number[]>([]); const [input, setInput] = useState<number[]>([]); const [preview, setPreview] = useState(false); const [flash, setFlash] = useState<number | null>(null); const [running, setRunning] = useState(false);
  const newRound = useCallback((current: number[]) => { const next = [...current, Math.floor(Math.random() * 4)]; setSequence(next); setInput([]); setPreview(true); next.forEach((tile, index) => window.setTimeout(() => setFlash(tile), 350 + index * 500)); window.setTimeout(() => { setFlash(null); setPreview(false); }, 500 + next.length * 500); }, []);
  useEffect(() => { if (!active) { setRunning(false); setPreview(false); } }, [active]);
  const start = () => { setRunning(true); newRound([]); };
  const press = (tile: number) => { if (!running || preview) { if (!running) start(); return; } const next = [...input, tile]; const expected = sequence[input.length]; setFlash(tile); window.setTimeout(() => setFlash(null), 160); if (tile !== expected) { setRunning(false); onFinish({ score: Math.max(20, (sequence.length - 1) * 100), durationMs: Math.max(700, sequence.length * 500), label: `LEVEL ${Math.max(1, sequence.length - 1)}` }); return; } if (next.length === sequence.length) { window.setTimeout(() => newRound(sequence), 350); } else setInput(next); };
  return <div className="blink-board"><div className="blink-copy"><span>LEVEL</span><strong>{Math.max(1, sequence.length)}</strong><p>{!running ? "TAP A TILE TO START" : preview ? "WATCH" : "REPEAT"}</p></div><div className="tile-grid">{[0, 1, 2, 3].map((tile) => <button key={tile} type="button" aria-label={`Pattern tile ${tile + 1}`} onClick={() => press(tile)} className={`memory-tile tile-${tile} ${flash === tile ? "is-flashing" : ""}`} />)}</div></div>;
}
