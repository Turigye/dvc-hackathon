# Codex Brief — Switchback

**Codex takes point on this one:** mechanic, feel, art direction and build. Claude coordinates, reviews, and owns the feed shell and the submission packet. Read `COORDINATION.md`, `design.md` and `GAMES.md` first, then log a lock under `## In flight` before touching shared files.

Everything currently in `src/games/` is a prototype. Switchback replaces `stack` as game one. Do not delete the other two yet — they stay as feed filler until Switchback is proven, then we decide.

---

## 1. Why this game

The user reviewed six concept posters and locked **Switchback**. It won because the mechanic is legible from a static image: a zigzag path, hazards falling on alternating sides, one control — `TAP TO FLIP`. That two-second read is the product requirement, not a nice-to-have.

The poster's art direction is now the **house style for the whole app**, not just this game.

## 2. Build order — blockout before art. This is not negotiable.

Ship these as separate commits:

1. **Blockout.** Plain rectangles and lines, one flat colour each, no texture, no grain, no type treatment. The path, the runner, the hazards, the fail state, the score.
2. **Feel pass.** Tune speed, ramp, input window, hazard spacing and the death moment until it is genuinely fun as ugly shapes. **Get the user to play it here.** If it is not fun in blockout, art will not save it, and re-tuning after art costs three times as much.
3. **Art pass.** Apply the house style. Geometry stays identical; only the skin changes.
4. **Juice pass.** Impact particles, `+1` popups, screen shake, haptics, optional audio.

Do not start step 3 before the user has played step 2.

## 3. The mechanic

A runner descends a continuous zigzag ribbon. It moves on its own. The path reverses direction at every vertex.

- **One control: tap flips the runner's lateral direction.** Nothing else.
- Reach a vertex without flipping and the runner runs off the edge — that is the primary fail.
- **Hazards** (the red pistons in the poster) slam down onto segments on a telegraphed beat. Being under one on impact is the second fail.
- **Endless.** Speed and hazard density ramp with score. Never a timer.
- **Score:** +1 per vertex cleared, bonus for clearing a hazard at close range — reward risk, and make the `+1` visible at the point of impact like the poster does.

You own the tuning. Targets to hit: the first flip must be learnable inside three seconds without instruction, and a death must always feel like the player's fault. If a death is unavoidable given the runner's position, the spawner is wrong — guarantee reachability.

## 4. Non-negotiables — the "can't play it on my phone" class of bug

These have already burned two build cycles. Every one is mandatory.

- **Touch is the primary input.** Test with real touch, not a mouse. `touch-action: none` on the play surface; the feed must never steal the gesture.
- **Input latency:** respond on `pointerdown`, never on `click` or `pointerup`.
- **The game must hard-stop when its card is not the active snap target** — cancel every animation frame, timer and audio node. Zombie loops across cards are the most likely bug in this build.
- **No wall-clock timers** and no forced round end. The brief forbids it.
- **390×844 first.** All interaction inside the bottom thumb arc, nothing critical under the notch, `env(safe-area-inset-*)` respected.
- **The card is exactly `100dvh`.** The play surface is `position: absolute; inset: 0`; all chrome overlays it with `pointer-events: none` except buttons. Nothing stacks in vertical flow.
- **Frame-rate independence.** Integrate with a delta time, clamped (`Math.min(64, now - prev)`), so a slow phone plays the same as a fast one.
- **`prefers-reduced-motion`** kills shake and particles; the game stays fully playable.

## 5. Verification — read this twice

**Claude previously reported these games working when they were not.** The cause: verification used synthetic `.click()` (which bypasses hit-testing) in an automation browser reporting `visibilityState: "hidden"`, where `requestAnimationFrame` is throttled to **zero frames per second**. Animation-driven games freeze there and look fine in a screenshot. Do not repeat this.

Required before you claim Switchback works:

1. **A deterministic step test.** Factor the simulation into a pure `step(state, dtMs, input) → state` function that does not call `requestAnimationFrame`. Test it headlessly: a scripted input sequence must produce an expected score and fail state. This makes the *logic* verifiable without a visible browser.
2. **Real input, not synthetic clicks.** Drive actual pointer/touch events and assert on resulting state.
3. **Confirm the page is visible** before trusting any motion check — assert `document.visibilityState === "visible"` and that rAF actually ticks, or state plainly in your handoff that motion was not verified.
4. **A real device pass.** The user tests on their phone at the LAN URL. Ask for that before declaring the checkpoint done.

State honestly in the Handoff log which of these you actually ran.

## 6. Art direction — the house style

From the Switchback poster. Apply across the whole app in the art pass.

- **Palette:** near-black ink `#0B0F1A`; cream `#EDE7DC` for type and path edges; cobalt `#1B48E0` for surfaces and motion; vermilion `#E8391B` for hazards and failure; amber `#F5A623` for `HI` scores and `+1` payoffs.
- **Semantics:** cobalt is safe and where you run. Vermilion is what kills you. Amber is what you earn. Never break this — colour is the game's primary language.
- **Type:** heavy condensed sans, uppercase, tight tracking, screen-printed feel for titles. Mono for `HI 84` and small labels.
- **Texture:** halftone/grain overlay at low opacity, and slightly rough edges. This is what separates it from generic flat-vector output — but implement it as **one tiling texture over a CSS layer**, never a per-frame effect.
- **Geometry:** isometric-leaning ribbon with a visible edge highlight, hard shadows, no gradients on gameplay elements, no glow soup.
- **Score display:** big cream numerals top-right, amber `HI` top-left, exactly as the poster.

## 7. Asset policy — generate less than you think

Switchback is code-drawn. Sprites would be heavier, harder to animate and worse to tune.

**Generate:** a seamless grain/noise tile, the `SWITCHBACK` wordmark treatment, the app icon / share card, and the OG image.

**Do not generate:** the path, hazards, runner, particles, or UI chrome. Those are CSS and canvas.

Every accepted asset gets a manifest entry in `public/assets/manifest.md` — prompt, usage, dimensions, format. AVIF/WebP for opaque, transparent PNG/WebP only when alpha is genuinely needed. Nothing raster on the LCP path.

## 8. Coordination

- Lock shared files in `COORDINATION.md` before editing. Claude owns `src/app/globals.css` and the feed shell (`tip-tap-arcade.tsx`); take a lock if you need them and Claude will stay out.
- **You own `design.md` and `GAMES.md` for this game** — the user has put you on point for design. Claude will review, not overwrite. Record disagreements in `Open questions` rather than building around them.
- Append a Handoff row per checkpoint stating what you actually verified and what you did not.
- Still open and still yours from earlier reviews: the sign-in merge bug (`REVIEW-02` P1-1), score-endpoint anti-cheat (`REVIEW-02` P1-2), and live Supabase/OAuth verification.

## 9. Definition of done for this checkpoint

- [ ] Switchback is playable on a real phone, in the feed, with touch.
- [ ] It is endless, ramps in difficulty, and never ends on a timer.
- [ ] Deaths are always avoidable from the runner's current position.
- [ ] A deterministic `step()` test passes headlessly with a scripted input sequence.
- [ ] The card is exactly `100dvh`; the game hard-stops when swiped away.
- [ ] House style applied; grain is one tiling layer, not a per-frame effect.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` all clean.
- [ ] Handoff row states exactly what was verified and on what device.
