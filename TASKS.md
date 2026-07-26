# Thumbtrance — task board

Single source of truth for what is done and what is not. Updated every checkpoint. Nothing gets dropped.

## Done

- [x] Eight games registered and playable — Switchback, Skyline, Pulse, Reflex, Overload, Swarm, Slice, Color Rings
- [x] Endless recycling snap feed, one card per screen, `100dvh` locked
- [x] Switchback rebuilt on ribbon geometry — two rails, vertex fold, pursuer, drag/sprint bands
- [x] Pulse / Reflex / Slice game-breaking bugs fixed
- [x] Stuck result card fixed (cleared the moment a run starts)
- [x] Per-game twists — sway, lying gates, decoy hand, breeding swarm, overcharge gamble, bombs
- [x] Bright saturated palette across all eight worlds
- [x] Procedural audio: 9 cues, mute toggle, per-world background pads, no files, no libraries
- [x] Juice: score pop, death shake + flash, taunts, pooled particle bursts, 150ms hit-stop
- [x] Arcade three-letter initials, persisted via `/api/initials`
- [x] Tap-to-open leaderboard sheet per game
- [x] Supabase live: schema repaired, 8 games seeded, persistence verified end-to-end
- [x] Auth: Google + Discord enabled, URL allow-list set, `/api/session` stops repeat prompts
- [x] Guest ids are v4 UUIDs (fixed a `crypto.randomUUID()` throw on non-secure origins)
- [x] Deployed to production at **https://thumbtrance.vercel.app**, auto-deploy on push
- [x] 27 unit tests; typecheck, lint, build all clean
- [x] Renamed to Thumbtrance
- [x] Boot screen with CSS logo — doubles as the audio gate (browsers need a gesture)
- [x] Retro game-select menu, eight tiles with high scores, jumps straight to a card
- [x] Pause / resume, including auto-pause when the tab hides
- [x] World background art wired in behind every game (Codex)
- [x] Result card no longer buries the action rail; BOARD button added to it
- [x] Rival ghost marker — "N TO PASS NOVA" on every card
- [x] Real chiptune music — 16-step sequencer with bass, arp, lead and drums; one original track per game, lookahead-scheduled
- [x] Codex art wired in: eight menu tiles, submission cover, OG crop
- [x] Fixed `.world-magenta` — Skyline had no colour world after the accent rename

## Pending — Claude

| Priority | Task | Notes |
| --- | --- | --- |
| 1 | Share / challenge link | Copies a URL today; should deep-link to the game with the score attached. |
| 2 | **3D game** | Only after everything above. Three.js would be the first new dependency. |

## Pending — Codex

| Priority | Task | Notes |
| --- | --- | --- |
| 1 | In-game element art | Backgrounds, tiles, cover and logo family all DONE and wired in. Remaining: the blockout element classes per game in `CODEX-ART-PROMPTS.md` (hazards, runner, tiles, dial, core, bugs, shapes, rings). |
| 2 | ~~Submission cover~~ | ✅ Delivered with OG crop and manifest entries. |
| 3 | Anti-cheat on the score endpoint | Deprioritised by the user but still open. |
| 4 | One real phone OAuth round-trip | Providers report enabled; no token round-trip observed yet. |

## Pending — user

- [ ] Play-test on a real phone with sound on
- [ ] Decide final name spelling — the app currently ships **Thumbtrance**; you have twice written *Thumbtrace*. Both are free; say which and it is a one-line change.
- [ ] Submit the form using `SUBMISSION.md`

## Deliberately not doing

- Co-play and Discord chat — user deferred to final additions
- Vertical-drag games — they fight the feed gesture (care-package warning)
- Stock art or audio — banned by `AGENTS.md` and it undercuts the originality criterion
