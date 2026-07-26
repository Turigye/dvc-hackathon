"use client";

import { GameController, Play, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import Image from "next/image";
import { games } from "@/lib/games";

/**
 * Boot screen. Also the audio gate — browsers only allow sound to start from a
 * real gesture, and this is the first one every player makes.
 */
export function Boot({
  onStart,
  onMenu,
  muted,
  onToggleSound,
}: {
  onStart: () => void;
  onMenu: () => void;
  muted: boolean;
  onToggleSound: () => void;
}) {
  return (
    <div className="boot" role="dialog" aria-label="Thumbtrance">
      <div className="boot-scan" aria-hidden="true" />
      <div className="boot-body">
        <p className="boot-kicker">{games.length} GAMES · ONE THUMB · NO MENUS</p>
        <h1 className="logo">
          <span>THUMB</span>
          <span className="logo-second">TRANCE</span>
        </h1>
        <p className="boot-tag">The feed you play.</p>

        <button type="button" className="boot-primary" onClick={onStart}>
          <Play weight="fill" /> PRESS TO PLAY
        </button>

        <div className="boot-secondary">
          <button type="button" onClick={onMenu}><GameController weight="fill" /> CHOOSE A GAME</button>
          <button type="button" onClick={onToggleSound} aria-pressed={!muted}>
            {muted ? <SpeakerSlash weight="fill" /> : <SpeakerHigh weight="fill" />} SOUND {muted ? "OFF" : "ON"}
          </button>
        </div>
        <p className="boot-hint">Sound is worth it.</p>
      </div>
    </div>
  );
}

/** Retro game-select grid. Every tile jumps straight into that game's card. */
export function GameMenu({
  bests,
  onPick,
  onClose,
}: {
  bests: Record<string, number>;
  onPick: (slug: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="menu" role="dialog" aria-label="Choose a game">
      <div className="menu-head">
        <h2>SELECT GAME</h2>
        <button type="button" className="sheet-close" onClick={onClose}>CLOSE</button>
      </div>
      <div className="menu-grid">
        {games.map((game) => (
          <button key={game.slug} type="button" className={`tile world-${game.accent}`} onClick={() => onPick(game.slug)}>
            <Image className="tile-art" src={`/assets/menu-${game.slug}.webp`} alt="" width={256} height={256} sizes="(max-width: 480px) 46vw, 220px" />
            <span className="tile-name">{game.title}</span>
            <span className="tile-rule">{game.kicker}</span>
            <span className="tile-best">{bests[game.slug] ? `HI ${bests[game.slug]}` : "NEW"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
