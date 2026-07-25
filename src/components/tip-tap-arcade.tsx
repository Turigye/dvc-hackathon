"use client";
/* eslint-disable react-hooks/set-state-in-effect -- game loops intentionally drive state from rAF and observer callbacks. */

import { ArrowDown, GoogleLogo, Ranking, ShareNetwork, Trophy } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { games, type GameSlug } from "@/lib/games";
import type { LeaderboardResponse } from "@/lib/score-store";
import { Switchback } from "@/games/switchback/switchback";
import { Slice } from "@/games/slice";
import { ColorRings } from "@/games/color-rings";
import type { GameResult } from "@/games/types";

const EMPTY: LeaderboardResponse = { entries: [], playerRank: null, percentile: 0, playerBest: 0 };
const CYCLE = 4;

const getDeviceId = () => {
  const key = "tip-tap-device-v1";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
};

const buildDeck = (cycles: number) => Array.from({ length: cycles }, (_, cycle) => games.map((game, index) => ({ slug: game.slug, key: `${game.slug}-${cycle}-${index}` }))).flat();

export function TipTapArcade() {
  const [deck, setDeck] = useState(() => buildDeck(CYCLE));
  const [activeIndex, setActiveIndex] = useState(0);
  const [deviceId, setDeviceId] = useState("");
  const [boards, setBoards] = useState<Record<GameSlug, LeaderboardResponse>>({ stack: EMPTY, slice: EMPTY, "color-rings": EMPTY });
  const [result, setResult] = useState<{ key: string; data: GameResult } | null>(null);
  const cards = useRef<Map<string, HTMLElement>>(new Map());
  const feed = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setDeviceId(getDeviceId()); }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const top = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const index = top?.target.getAttribute("data-index");
      if (index !== null && index !== undefined) { setActiveIndex(Number(index)); setResult(null); }
    }, { threshold: [.6] });
    cards.current.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [deck]);

  useEffect(() => { if (activeIndex > deck.length - 4) setDeck((current) => [...current, ...buildDeck(2)]); }, [activeIndex, deck.length]);

  const activeSlug = deck[activeIndex]?.slug ?? games[0].slug;

  const loadBoard = useCallback(async (game: GameSlug) => {
    if (!deviceId) return;
    const response = await fetch(`/api/leaderboard?game=${game}&device=${deviceId}`, { cache: "no-store" });
    if (response.ok) { const board = await response.json() as LeaderboardResponse; setBoards((current) => ({ ...current, [game]: board })); }
  }, [deviceId]);

  useEffect(() => { void loadBoard(activeSlug); const id = window.setInterval(() => void loadBoard(activeSlug), 8000); return () => clearInterval(id); }, [activeSlug, loadBoard]);

  const submit = useCallback(async (game: GameSlug, key: string, data: GameResult) => {
    setResult({ key, data });
    if (!deviceId) return;
    await fetch("/api/scores", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game, score: data.score, durationMs: data.durationMs, roundId: crypto.randomUUID(), deviceId }) });
    await loadBoard(game);
  }, [deviceId, loadBoard]);

  const share = async (slug: GameSlug) => {
    const url = new URL(location.href);
    url.searchParams.set("game", slug);
    url.searchParams.set("beat", String(boards[slug].playerBest));
    await navigator.clipboard?.writeText(url.toString());
  };

  return (
    <main className="arcade">
      <header className="topbar">
        <span className="wordmark">TIP<b>TAP</b></span>
        <span className="counter">{(activeIndex % games.length) + 1} / {games.length}</span>
      </header>

      <div className="feed" ref={feed}>
        {deck.map((card, index) => {
          const game = games.find((item) => item.slug === card.slug)!;
          const board = boards[card.slug];
          const live = index === activeIndex;
          return (
            <section
              key={card.key}
              data-index={index}
              ref={(element) => { if (element) cards.current.set(card.key, element); else cards.current.delete(card.key); }}
              className={`card world-${game.accent}`}
              aria-label={`${game.title} game`}
            >
              <div className="stage-host">
                {card.slug === "stack" && <Switchback active={live} onFinish={(data) => void submit("stack", card.key, data)} />}
                {card.slug === "slice" && <Slice active={live} onFinish={(data) => void submit("slice", card.key, data)} />}
                {card.slug === "color-rings" && <ColorRings active={live} onFinish={(data) => void submit("color-rings", card.key, data)} />}
              </div>

              <div className="chrome">
                <div className="title-block">
                  <h2>{game.title}</h2>
                  <p>{game.kicker}</p>
                </div>

                <aside className="rail">
                  <div className="rail-item"><Trophy weight="fill" /><b>{board.playerBest || "—"}</b><span>BEST</span></div>
                  <div className="rail-item"><Ranking weight="fill" /><b>{board.playerRank ? `#${board.playerRank}` : "—"}</b><span>RANK</span></div>
                  <button type="button" className="rail-item is-button" onClick={() => void share(card.slug)}><ShareNetwork weight="fill" /><span>SHARE</span></button>
                </aside>

                <div className="board-strip">
                  {board.entries.slice(0, 3).map((entry) => (
                    <span key={`${entry.rank}-${entry.player}`} className={entry.isYou ? "is-you" : ""}>{entry.rank}. {entry.player} <b>{entry.score}</b></span>
                  ))}
                  {!board.entries.length && <span>BE THE FIRST ON THE BOARD</span>}
                </div>

                <div className="swipe-cue"><ArrowDown weight="bold" /> SWIPE FOR NEXT</div>
              </div>

              {result?.key === card.key && (
                <div className="result" role="status">
                  <span>GAME OVER</span>
                  <strong>{result.data.score}</strong>
                  <p>{result.data.label}{board.percentile ? ` — BEAT ${board.percentile}% OF PLAYERS` : ""}</p>
                  <div className="result-actions">
                    <a className="save" href={`/auth/login?device=${deviceId}`}><GoogleLogo weight="fill" /> KEEP THIS SCORE</a>
                    <button type="button" className="again" onClick={() => setResult(null)}>PLAY AGAIN</button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
