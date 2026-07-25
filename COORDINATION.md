# Multi-Agent Coordination

Two agents work this repo concurrently: **Claude (lead / creative direction)** and **Codex (implementation)**. Read this before editing shared files.

## Authority

| Domain | Owner | Rule |
| --- | --- | --- |
| Brief selection, scope cuts | Claude | Codex proposes, Claude decides. |
| `design.md` — creative direction, tokens | **Claude — exclusive write** | Codex must not rewrite this file. Raise disagreements as a note in `## Open questions` below. |
| Game mechanic design + feel | Claude | Codex implements the contract; mechanic invention is a direction call. |
| `src/` implementation | Codex | Claude reviews, does not race-edit the same file. |
| Schema, data layer, auth | Codex | Must stay within the three-table shape in the brief. |
| Dependencies | Codex | Anything that ships client-side JS needs a one-line justification here. |
| Deployment, submission packet | Claude | — |

## File locking convention

To avoid clobbering, **announce before editing a shared file** by adding a line under `## In flight`. Remove it when done. Shared files: `design.md`, `AGENTS.md`, `README.md`, `package.json`, `src/app/globals.css`, `src/app/layout.tsx`.

Anything under `src/games/` is Codex-owned and needs no announcement.

## In flight

_(empty)_

## Confirmed decisions

- **Brief: Concept 01 — Tip Tap Games.** Chosen for deterministic demo, zero external AI dependency in the critical path, and graceful degradation (any single game can be cut without breaking the feed).
- **Creative direction: coin-op arcade nostalgia.** See `design.md`. Nostalgia must read as *behavior* — attract mode, three-letter initials, machine copy — not as pixel-art decoration.
- **Stack:** Next.js 16 App Router, React 19, Tailwind v4, Supabase (Postgres + OAuth), zod for score validation.
- **Identity ladder:** guest device ID → three-letter initials on a qualifying run → OAuth only when a score is worth keeping. Guest scores merge on sign-in.

## Game component contract

Every game in `src/games/<slug>/` exports a component conforming to one interface. The feed owns lifecycle; the game owns only its mechanic.

```ts
export type GameProps = {
  /** True only while this card is the active snap target. Mount work is fine
   *  when false; no rAF loop, timer, or audio may run when false. */
  active: boolean;
  /** True when on-screen but not yet touched — run the autopilot demo loop. */
  attract: boolean;
  /** Call on every score change. The feed renders the readout; games never
   *  draw their own score chrome. */
  onScore: (score: number) => void;
  /** Call once when a run terminates. Triggers initials capture + persistence. */
  onGameOver: (finalScore: number) => void;
};
```

Hard rules for every game:

1. **One mechanic**, understandable in two seconds, one thumb, endless or round-based — never timer-forced.
2. **Hard stop on `active === false`.** Cancel every `requestAnimationFrame`, timer and audio node. Zombie loops across cards are the single most likely bug in this build.
3. **No score chrome.** Report via `onScore`; the feed draws it.
4. **Code-native geometry only** — no sprite sheets, no raster assets.
5. **Server-validated scores.** Client score is a claim; the write path caps and validates it.

## Open questions

_(Codex: append here rather than editing owned files.)_
