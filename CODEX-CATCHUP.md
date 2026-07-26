# Codex catch-up — 2026-07-26 ~04:00 EAT

Everything that changed since your last commit (`9a3d889`). Read before touching anything.

## The project is now called **Thumbtrance**

"Tip Tap Games" is the brief's own working title, so most competitors are shipping under it. Renamed in `layout.tsx` metadata, the wordmark, and `package.json`. Component and file names still say `tip-tap-arcade` — cosmetic debt, not worth churn now.

## Eight games are live

`switchback` · `skyline` · `pulse` · `reflex` · `overload` · `swarm` · `slice` · `color-rings`

The feed recycles them endlessly. Adding a game is now a pure code change: register in `src/lib/games.ts`, add a branch in `tip-tap-arcade.tsx`, seed a row in `public.games`. **No schema change needed** — the slug `CHECK` constraint is gone.

Input models are deliberately spread: tap-timing, press-and-hold, target-tap, swipe, tap-rotate. Per the care package's gesture warning, **nothing uses vertical drag** — it fights the feed.

## Switchback is finished and frozen

Rebuilt on ribbon geometry: two rails, one control, and the runner's rail **inverts at every vertex** because the ribbon folds. Varied telegraphed hazards, drag bands that slow you, sprint pads that speed you, and a pursuer that closes steadily and is pushed back only by risk. 27 tests cover fairness, determinism, frame-rate independence and chase balance both ways.

Bug fixes and your art pass only. Don't redesign it.

## Three games were broken; all fixed

- **Pulse** — collision demanded the bird be in the top or bottom *section*, but the gap is the middle. It died at the first gate every time.
- **Reflex** — hit test read `delta > 180 - arc/2`; `delta` is already the distance from target, so it required tapping the opposite side of the dial. Correct taps ended the run.
- **Slice** — half-fragment keys `id*2+dir` collided (shape 1 and 2 both produced 3), stacking React duplicate-key errors on every cut.

## Infrastructure is done

- **Migration applied to the live database** via the Management API. `device_id`/`round_id` are `text`, slug constraint dropped, all eight games seeded. Production previously still held `burn-in`/`lcd-run`/`signal-lock`, which is why every insert silently fell back to memory.
- **Persistence verified end to end** — POST → 200 → leaderboard rank → row confirmed by SQL join.
- **Auth URL config set**: site URL plus allow-list for LAN, localhost and `*.vercel.app`. Google **and** Discord providers enabled.
- **Guest ids are now v4-shaped UUIDs.** `roundId` was calling `crypto.randomUUID()` directly, which *throws* on a non-secure origin — that was breaking scoring on the LAN preview.
- **`/api/session`** added so a signed-in player is never prompted to log in again; the result card shows `SAVED AS <name>`.

## Design direction changed

Backgrounds were near-black and lifeless. All eight worlds now use bright saturated pairs, `--ink` moved from `#08070C` to `#151033`, and the vignette dropped to a soft indigo at 32%.

Switchback keeps the poster language: solid cream rail edges, dark offset slab for isometric depth, sparse centre stripes.

## Each game has a twist

Skyline sways with height · Pulse gates lie past 40 pts · Reflex grows a decoy hand past 6 hits · Swarm escapes shorten the next spawn · Overload overcharge is a 40% supercharge gamble · Slice bombs end the run if cut.

## Audio just landed

`src/lib/audio.ts` — procedural WebAudio, **no library and no sound files**. Howler and Tone assume samples we don't have, and stock audio carries the same licence/originality problem as stock art. Nine cues, muted by default, capped at 8 voices, silenced when a card leaves the viewport. Mute toggle in the top bar.

## Open for you

1. **Art pass** on Switchback and Skyline — blockout classes are listed in the handoff log.
2. **Anti-cheat** on the score endpoint (deprioritised by the user, still yours).
3. **One real OAuth sign-in test** on a phone. Providers report enabled but no token round-trip has been observed.
4. Do **not** re-enable a slug CHECK constraint or reintroduce UUID-only id validation.

## Still blocked on the user

Vercel deploy. Needs a `VERCEL_TOKEN` in `.env.local`; the MCP deploy tool would require hand-inlining 95KB with no auto-redeploy.
