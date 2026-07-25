# Tip Tap Games Design System

> **Claude owns this file.** Codex implements against it and does not rewrite it. See `COORDINATION.md`.

## Product intent

- **Product / app name:** Tip Tap Games
- **Target user:** A phone user with three idle minutes and no patience for a menu.
- **User problem:** Most casual games demand setup, instructions, or an install before the first rewarding action. Short-form feeds removed all of that — but made you passive.
- **Primary user journey:** Open feed → a game is already running → play a round → see rank and percentile → save a strong score or swipe to a different mechanic.
- **Primary action / conversion:** Complete a round and see it ranked. Authenticate only after a score is worth keeping.
- **Success criteria from the brief:** Three genuinely different games, one-card snap feed, guest-first persistent scores, server-side validation, mobile 390×844 excellence, live leaderboard, public deployment.

## Creative direction

> **Direction reset, 2026-07-25 21:50 EAT.** The previous CRT-phosphor direction was mine and it was wrong: it produced three near-identical monochrome cards that the user correctly called generic and soulless. On a Shorts-style feed, every card must feel like a different world.

- **Design thesis:** A vertical feed of vivid, self-contained colour worlds. Each card is loud, saturated and instantly distinguishable from the one above it — the way consecutive Shorts are. The game fills the screen; chrome floats on top of it and never takes vertical flow.
- **Tone:** Fast, bright, confident, a little brash. Machine-terse copy — `GAME OVER`, `BEST`, `RANK` — set against big display type.
- **Visual metaphor:** A neon arcade floor seen one cabinet at a time, each lit in its own colour.
- **Nostalgia lives in behavior, not skin.** Attract mode, three-letter initials, `GAME OVER`, a permanently visible high-score board. Never pixel-art decoration, "8-bit" emoji or chiptune.
- **What must feel distinct:**
  1. **Three colour worlds.** Magenta (Stack), acid (Slice), electric (Color Rings). Each drives its own accent, glow and background gradient through `--pop` and `--bg1/--bg2`.
  2. **Full-bleed play.** The stage is `inset: 0`. HUD, title, rail and board strip are overlaid with `pointer-events: none` except the buttons.
  3. **Juice as a first-class feature.** Score pop, combo pills, swipe trails, split-apart halves, falling shards, glow on every accent element.
  4. **The right-hand rail** carries BEST / RANK / SHARE — the Shorts action-rail position, but scoring rather than vanity metrics.
- **What to avoid:** Default purple/green AI gradients, stock imagery, copied layouts, decorative filler, excessive pills, unmeasured heavy animation, and any card that looks like its neighbour.

## Reference ledger

| Source | URL | Observed idea | Original implementation decision |
| --- | --- | --- | --- |
| getdesign.md | https://getdesign.md/ | Systems should explain reasoning, not just tokens. | This file records the reasoning behind every token and gameplay state. |
| Aura | https://www.aura.build/design-systems?sort=popular | A coherent system can carry varied screens. | All games share type, telemetry, surface and feedback rules while keeping one distinct mechanic each. |
| Coin-op arcade convention | — | Three-letter high-score initials. | Guest identity primitive — initials captured post-run, merged into an OAuth account on sign-in. |
| Coin-op attract mode | — | An idle cabinet demo-plays itself. | On-screen-but-untouched cards run an autopilot loop; first touch hands over control mid-frame. |
| Tiger Electronics LCD handhelds | — | Segment ghosting on a fixed dark substrate. | Inactive elements render as low-alpha "ghosts" rather than disappearing. |
| Godly | https://godly.website/ | Typography can be the primary visual asset. | Type, border and colour carry the entire product; near-zero raster imagery ships. |

## Tokens

### Typography

Two families only, both loaded locally through `next/font`.

| Role | Family | Weight | Size / line-height | Tracking |
| --- | --- | --- | --- | --- |
| Display (score, HI-SCORE, GAME OVER) | Silkscreen | 700 | clamp(2rem, 12vw, 3.5rem) / 1.0 | .04em |
| Heading (game title) | Silkscreen | 700 | 1.125rem / 1.2 | .08em, uppercase |
| Body (rule text) | IBM Plex Mono | 500 | .9375rem / 1.45 | 0 |
| UI label (rail, rank, initials) | IBM Plex Mono | 600 | .72rem / 1.15 | .14em, uppercase |

**Rule:** the pixel display face is for **numbers and machine words only**. Never set a sentence in it — legibility dies and it reads as costume.

### Color roles

Three worlds, each supplying `--bg1`, `--bg2` and `--pop`. Shared neutrals sit on top of all three.

| Role | Value | Usage | Contrast check |
| --- | --- | --- | --- |
| Ink | `#08070C` | Feed background, vignette floor | — |
| Paper | `#FFFFFF` | Primary text, score display | 19.4:1 on ink ✓ |
| Dim | `rgb(255 255 255 / .62)` | Secondary labels, rule text | 7.2:1 on ink ✓ |
| Line | `rgb(255 255 255 / .18)` | Hairline borders, pills | Decorative only |
| Magenta world | `--bg1:#25062F` `--bg2:#8B1BA6` `--pop:#FF2E88` | Stack | Pop 6.1:1 on bg1 ✓ |
| Acid world | `--bg1:#08251A` `--bg2:#0E8A57` `--pop:#C6FF00` | Slice | Pop 14.8:1 on bg1 ✓ |
| Electric world | `--bg1:#040F35` `--bg2:#1157C7` `--pop:#00E5FF` | Color Rings | Pop 11.9:1 on bg1 ✓ |

**Semantic rule:** `--pop` is the world's single accent — score, glow, active state, primary action. Never encode state by colour alone; always colour plus copy or icon.

### Layout and depth

- **Design width:** 390×844 first. Desktop is a centred 430px cabinet on a dark floor, never a stretched layout.
- **Content width and gutters:** Full-bleed card, 16px mobile gutters, `env(safe-area-inset-*)` respected.
- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48px.
- **Radius scale:** 0, 2, 4 only. Cabinets have corners.
- **Border treatment:** 2px solid `--border`. Hard edges, no blur, no glass.
- **Shadow / elevation rules:** No drop shadows. Elevation is phosphor glow — `box-shadow: 0 0 12px` accent at low alpha, on active elements only, never animated per frame.
- **Breakpoints:** 390 base, 430, 768 (cabinet frame and second telemetry column appear).

## Components and states

| Component | Variants | Hover / focus / disabled | Mobile behavior |
| --- | --- | --- | --- |
| Game card | active / attract / ghost | 2px phosphor focus outline, always visible on keyboard | Full-bleed, snap-aligned, one per viewport |
| Action rail | hi-score, rank, share | Focus ring; disabled at 45% opacity | Right edge, thumb-reachable vertical stack |
| Score readout | live / best / final | n/a | Top-left, tabular numerals, never reflows |
| Initials entry | 3-slot character picker | Phosphor caret blink on focus | Bottom sheet over the card, never a route change |
| Leaderboard | top 10 + your rank | Row focus outline | Expands in-card; never navigates away |
| Feedback states | precision / miss / new best / save prompt | Colour + copy + icon, never colour alone | Bottom sheet replaces modal |

## Motion and media

- **Motion purpose and duration:** 120ms tap response, 180ms result reveal, ≤400ms score pop, native scroll-snap for card transitions (not JS-animated). Everything else is instant.
- **Compositor rule:** `transform` and `opacity` only. No animated `width`, `top`, `filter` or `box-shadow` on a per-frame path. `requestAnimationFrame` runs only while a card is active.
- **Reduced-motion behavior:** `prefers-reduced-motion` disables score pop, attract-mode autoplay and scanline flicker; the overlay goes static. Games stay fully playable and functional timing state is retained.
- **LCP element and loading strategy:** The first game card's title, rule text and score chrome are server-rendered into initial HTML with local `next/font`. The LCP element is text — no image on the LCP path.
- **Image roles and aspect ratios:** Gameplay visuals are code-native geometry. The only raster asset is a 16:9 submission cover, which never loads in the app.
- **Audio:** Off by default. Short synthesized WebAudio blips only, behind an explicit unmute. Never autoplay.
- **Generated asset manifest location:** `public/assets/manifest.md`

## Acceptance checklist

- [ ] Primary journey is complete and testable.
- [ ] Every component follows the token system.
- [ ] Desktop and mobile behavior are specified.
- [ ] Design is original and each reference contribution is recorded.
- [ ] Image, accessibility, and performance decisions are explicit.
- [ ] Nostalgia reads as behavior — attract mode, initials, machine copy — not as decoration.
