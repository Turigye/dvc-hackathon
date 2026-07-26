"use client";
/* eslint-disable react-hooks/set-state-in-effect -- game loops intentionally drive state from rAF and observer callbacks. */

import { ArrowDown, GoogleLogo, Ranking, ShareNetwork, SpeakerHigh, SpeakerSlash, Trophy } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClientId } from "@/lib/client-id";
import { isMuted, loadMutePreference, setMuted, silence, startMusic, stopMusic } from "@/lib/audio";
import { games, type GameSlug } from "@/lib/games";
import type { LeaderboardResponse } from "@/lib/score-store";
import { Switchback } from "@/games/switchback/switchback";
import { Stack } from "@/games/stack";
import { Pulse } from "@/games/pulse";
import { Reflex } from "@/games/reflex";
import { Overload } from "@/games/overload";
import { Swarm } from "@/games/swarm";
import { Slice } from "@/games/slice";
import { ColorRings } from "@/games/color-rings";
import type { GameResult } from "@/games/types";

const EMPTY: LeaderboardResponse = { entries: [], playerRank: null, percentile: 0, playerBest: 0 };
const CYCLE = 4;

/** Machine-voice reactions. Picked by how the run went, not at random. */
const TAUNTS = {
  poor: ["THAT WAS QUICK", "OOF", "BARELY TRIED", "EMBARRASSING"],
  ok: ["NOT BAD", "DECENT", "KEEP GOING", "WARMING UP"],
  good: ["SHOW OFF", "NICE RUN", "DANGEROUS", "ON FIRE"],
  best: ["NEW BEST", "PERSONAL RECORD", "UNTOUCHABLE"],
} as const;

const taunt = (score: number, best: number) => {
  const pool = score > best && score > 0 ? TAUNTS.best : score < 40 ? TAUNTS.poor : score < 150 ? TAUNTS.ok : TAUNTS.good;
  return pool[Math.floor(Math.random() * pool.length)];
};

const getDeviceId = () => {
  const key = "tip-tap-device-v1";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = createClientId();
  localStorage.setItem(key, created);
  return created;
};

const buildDeck = (cycles: number) => Array.from({ length: cycles }, (_, cycle) => games.map((game, index) => ({ slug: game.slug, key: `${game.slug}-${cycle}-${index}` }))).flat();

export function TipTapArcade() {
  const [deck, setDeck] = useState(() => buildDeck(CYCLE));
  const [activeIndex, setActiveIndex] = useState(0);
  const [deviceId, setDeviceId] = useState("");
  const [boards, setBoards] = useState<Record<GameSlug, LeaderboardResponse>>({ switchback: EMPTY, skyline: EMPTY, pulse: EMPTY, reflex: EMPTY, overload: EMPTY, swarm: EMPTY, slice: EMPTY, "color-rings": EMPTY });
  const [result, setResult] = useState<{ key: string; data: GameResult } | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [account, setAccount] = useState<{ signedIn: boolean; name?: string }>({ signedIn: false });
  const [mute, setMute] = useState(true);
  const [initials, setInitials] = useState<string | null>(null);
  const [draft, setDraft] = useState("AAA");
  const [boardOpen, setBoardOpen] = useState<string | null>(null);
  const cards = useRef<Map<string, HTMLElement>>(new Map());
  const feed = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setDeviceId(getDeviceId()); setMute(loadMutePreference()); }, []);
  // Ask once who is signed in. A logged-in player should never be prompted again.
  useEffect(() => { void fetch("/api/session", { cache: "no-store" }).then((r) => r.json()).then(setAccount).catch(() => {}); }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const top = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const index = top?.target.getAttribute("data-index");
      if (index !== null && index !== undefined) { setActiveIndex(Number(index)); setResult(null); silence(); }
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

  useEffect(() => { if (!mute) startMusic(games.findIndex((g) => g.slug === activeSlug)); return () => stopMusic(); }, [activeSlug, mute]);
  useEffect(() => { void loadBoard(activeSlug); const id = window.setInterval(() => void loadBoard(activeSlug), 8000); return () => clearInterval(id); }, [activeSlug, loadBoard]);

  const submit = useCallback(async (game: GameSlug, key: string, data: GameResult) => {
    // Hit-stop: let the player see the frame they died on before the card lands.
    window.setTimeout(() => setResult({ key, data }), 150);
    if (!deviceId) return;
    await fetch("/api/scores", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game, score: data.score, durationMs: data.durationMs, roundId: createClientId(), deviceId }) });
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
        <span className="wordmark">THUMB<b>TRANCE</b></span>
        <div className="top-actions">
          <button type="button" className="mute" aria-pressed={!mute} aria-label={mute ? "Turn sound on" : "Turn sound off"}
            onClick={() => setMute(setMuted(!isMuted()))}>
            {mute ? <SpeakerSlash weight="fill" /> : <SpeakerHigh weight="fill" />}
          </button>
          <span className="counter">{(activeIndex % games.length) + 1} / {games.length}</span>
        </div>
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
              className={`card world-${game.accent} ${playingKey === card.key ? "is-playing" : ""} ${result?.key === card.key ? "is-over" : ""}`}
              aria-label={`${game.title} game`}
            >
              <div className="stage-host">
                {card.slug === "switchback" && <Switchback active={live} onFinish={(data) => void submit("switchback", card.key, data)} onRunningChange={(running) => { if (running) setResult(null); setPlayingKey(running ? card.key : (current) => (current === card.key ? null : current)); }} />}
                {card.slug === "skyline" && <Stack active={live} onFinish={(data) => void submit("skyline", card.key, data)} />}
                {card.slug === "pulse" && <Pulse active={live} onFinish={(data) => void submit("pulse", card.key, data)} onRunningChange={(running) => { if (running) setResult(null); setPlayingKey(running ? card.key : (current) => (current === card.key ? null : current)); }} />}
                {card.slug === "reflex" && <Reflex active={live} onFinish={(data) => void submit("reflex", card.key, data)} onRunningChange={(running) => { if (running) setResult(null); setPlayingKey(running ? card.key : (current) => (current === card.key ? null : current)); }} />}
                {card.slug === "overload" && <Overload active={live} onFinish={(data) => void submit("overload", card.key, data)} onRunningChange={(running) => { if (running) setResult(null); setPlayingKey(running ? card.key : (current) => (current === card.key ? null : current)); }} />}
                {card.slug === "swarm" && <Swarm active={live} onFinish={(data) => void submit("swarm", card.key, data)} onRunningChange={(running) => { if (running) setResult(null); setPlayingKey(running ? card.key : (current) => (current === card.key ? null : current)); }} />}
                {card.slug === "slice" && <Slice active={live} onFinish={(data) => void submit("slice", card.key, data)} />}
                {card.slug === "color-rings" && <ColorRings active={live} onFinish={(data) => void submit("color-rings", card.key, data)} />}
              </div>

              <div className="chrome">
                <div className="title-block">
                  <h2>{game.title}</h2>
                  <p>{game.kicker}</p>
                </div>

                <aside className="rail">
                  <button type="button" className="rail-item is-button" onClick={() => setBoardOpen(card.key)} aria-label={`${game.title} leaderboard`}><Trophy weight="fill" /><b>{board.playerBest || "—"}</b><span>BEST</span></button>
                  <button type="button" className="rail-item is-button" onClick={() => setBoardOpen(card.key)} aria-label={`Your rank in ${game.title}`}><Ranking weight="fill" /><b>{board.playerRank ? `#${board.playerRank}` : "—"}</b><span>RANK</span></button>
                  <button type="button" className="rail-item is-button" onClick={() => void share(card.slug)}><ShareNetwork weight="fill" /><span>SHARE</span></button>
                </aside>

                <button type="button" className="board-strip" onClick={() => setBoardOpen(card.key)} aria-label={`Open the ${game.title} leaderboard`}>
                  {board.entries.slice(0, 3).map((entry) => (
                    <span key={`${entry.rank}-${entry.player}`} className={entry.isYou ? "is-you" : ""}>{entry.rank}. {entry.player} <b>{entry.score}</b></span>
                  ))}
                  {!board.entries.length && <span>BE THE FIRST ON THE BOARD</span>}
                </button>

                <div className="swipe-cue"><ArrowDown weight="bold" /> SWIPE FOR NEXT</div>
              </div>

              {boardOpen === card.key && (
                <div className="board-sheet" role="dialog" aria-label={`${game.title} leaderboard`}>
                  <div className="sheet-head">
                    <h3>{game.title}</h3>
                    <button type="button" className="sheet-close" onClick={() => setBoardOpen(null)} aria-label="Close leaderboard">CLOSE</button>
                  </div>
                  <ol className="sheet-rows">
                    {board.entries.length ? board.entries.map((entry) => (
                      <li key={`${entry.rank}-${entry.player}`} className={entry.isYou ? "is-you" : ""}>
                        <span className="rank">{String(entry.rank).padStart(2, "0")}</span>
                        <span className="who">{entry.player}</span>
                        <span className="pts">{entry.score}</span>
                      </li>
                    )) : <li className="empty">NOBODY HAS PLAYED THIS YET</li>}
                  </ol>
                  {board.playerRank && <p className="sheet-foot">YOU ARE #{board.playerRank} — TOP {100 - board.percentile + 1}%</p>}
                </div>
              )}

              {result?.key === card.key && (
                <div className="result" role="status">
                  <span>{taunt(result.data.score, board.playerBest)}</span>
                  <strong key={result.data.score}>{result.data.score}</strong>
                  <p>{result.data.label}{board.percentile ? ` — BEAT ${board.percentile}% OF PLAYERS` : ""}</p>
                  <div className="result-actions">
                    {account.signedIn ? (
                      <span className="saved">SAVED AS {account.name}</span>
                    ) : initials ? (
                      <span className="saved">ON THE BOARD AS {initials}</span>
                    ) : (
                      <div className="initials">
                        <span className="initials-label">ENTER YOUR INITIALS</span>
                        <div className="initials-slots">
                          {[0, 1, 2].map((slot) => (
                            <button key={slot} type="button" className="slot" aria-label={`Letter ${slot + 1}: ${draft[slot]}`}
                              onClick={() => setDraft((current) => {
                                const next = current.split("");
                                next[slot] = String.fromCharCode(((next[slot].charCodeAt(0) - 65 + 1) % 26) + 65);
                                return next.join("");
                              })}>{draft[slot]}</button>
                          ))}
                        </div>
                        <button type="button" className="save" onClick={() => { setInitials(draft); void fetch("/api/initials", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId, initials: draft }) }); }}>CLAIM IT</button>
                        <a className="again" href={`/auth/login?device=${deviceId}`}><GoogleLogo weight="fill" /> OR SIGN IN</a>
                      </div>
                    )}
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
