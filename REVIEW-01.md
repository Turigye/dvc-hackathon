# Review 01 — Claude (lead) on `1ea1527`

Codex: fix in this order. P0 items are brief violations that fail a Definition-of-Done row; a judge finds both in under a minute. Do not start new features until P0 and P1 are closed.

## What's good — keep it

Feed lifecycle, snap behavior, API routes, migration, guest device ID, percentile copy, focus-visible coverage, reduced-motion block. Typecheck and lint are clean. The CSS is dense but correct. None of this needs rework.

---

## P0-1 — `Slipstream` is not a playable game

`src/components/tip-tap-arcade.tsx:119-126`. The final score is `1200 + runnerRef.current * 4` — purely the thumb's x-position when the timer expires. The three hazards (`.h-one/.h-two/.h-three`) are static CSS at fixed offsets with **no collision detection anywhere**. The player cannot lose, and dragging does not meaningfully change the outcome.

This fails the DoD row "3+ playable games — three genuinely different mechanics."

**Fix:** replace it with **LCD RUN** as specced in `GAMES.md` — three lanes, obstacles advancing one discrete row per tick, real collision, endless. Discrete stepping is both the mechanic and the nostalgia; obstacles must snap between rows with **zero CSS transition**.

## P0-2 — Timed rounds violate the brief

`src/lib/games.ts` sets `duration: 30 / 20 / 45`, and Beat Drop and Slipstream hard-stop on a wall clock. The brief is explicit: *"Each is endless or round-based — the player decides when to stop, never a timer."* The card topline also prints `45 SEC` for Blinkstack, which is round-based — the label is simply wrong.

**Fix:** delete `duration` from `GameDefinition` and remove every countdown.
- **Beat Drop** → endless. Three misses (accuracy 0) ends the run. Difficulty ramps: sweep period 1800ms → 700ms as score climbs.
- **LCD RUN** → endless, ends on collision.
- **Blinkstack** → already round-based. Just drop the `45 SEC` label.

Replace the topline right-hand slot with `HI <personal best>` in amber.

## P1-1 — Zombie timers on swipe-away

`tip-tap-arcade.tsx:130`. `newRound` schedules `next.length + 1` un-tracked `window.setTimeout` calls. Swiping mid-preview leaves them pending; they fire `setFlash` against a card that is no longer active. This is the exact failure the contract warns about.

**Fix:** collect timeout ids in a ref, clear them in the `!active` effect and on unmount. Audit all three games for the same pattern.

## P1-2 — One leaderboard shared by all three cards

A single `leaderboard` state object is rendered into every card, so inactive cards display the *active* game's board. Visible while scrolling.

**Fix:** key the board by slug — `Record<GameSlug, LeaderboardResponse>` — and render each card its own.

## P1-3 — Missing signature nostalgia mechanics

`design.md` names four; two are absent and they are the two that carry the concept.

- **Three-letter initials.** There is no initials capture at all — identity is Google OAuth only. Add the `AAA` picker as a bottom sheet on a qualifying run (top 10 for that game, or any personal best). Guest scores persist under initials + device ID; OAuth stays optional and merges on sign-in.
- **Attract mode.** The `GameProps` contract has an `attract` flag that was never implemented. An on-screen, untouched card must demo-play itself; first touch takes over mid-frame. Per-game autopilot behavior is specced in `GAMES.md`.

## P2-1 — rAF loop rebuilds on every tap

`tip-tap-arcade.tsx:113`. The effect lists `score` in its deps, so every tap cancels and re-creates the animation frame loop, and `tick` closes over a stale `score`. Move score into a ref and drop it from the dep array.

## P2-2 — Design tokens do not match `design.md`

`globals.css:3` is still the cobalt/vermilion editorial palette. The approved direction is CRT phosphor. Swap the token block:

```
--canvas:#080B0A; --surface:#101614; --text:#EAF2EC; --muted:#7E8F82;
--border:#23302A; --green:#4CE07A; --amber:#FFB000; --vermilion:#FF4A26;
```

Semantics: green = doing well, amber = the record, vermilion = you lost something. Max two accents per card. Borders go to 2px, radius to 0–4, drop shadows out — elevation is phosphor glow on active elements only. Type is Silkscreen for numbers and machine words, IBM Plex Mono for everything else; a pixel face must never set a sentence.

Copy goes machine-voice throughout: `GAME OVER`, `HI-SCORE`, `INSERT COIN`. Not "ROUND COMPLETE" / "Your score is now on the board."

---

## Scope guard

If we are behind at hour eight, cut in this order: attract mode → share/challenge link → OAuth (initials alone carry the leaderboard). **Never cut:** three real mechanics, the snap feed, persisted scores, or the live board.
