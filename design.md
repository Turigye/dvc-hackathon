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

- **Design thesis:** The arcade cabinet, shrunk to a thumb. We are not skinning a modern app in retro decoration — we are rebuilding the *feedback language* of a coin-op machine: instant response, loud scoring, a permanently visible high-score board, and a cabinet that is always already playing.
- **Era anchor:** Late-80s / early-90s coin-op arcade and the first handheld LCDs. Phosphor glow, CRT scanline, segment-LCD ghosting, attract mode, `HI-SCORE`, three-letter initials.
- **Tone:** Terse, mechanical, confident. Machine voice, never marketing voice. `INSERT COIN`, not "Get started!". `GAME OVER`, not "Nice try!".
- **Visual metaphor:** A CRT that never turns off. Each card is a different cabinet on the same arcade floor.
- **What must feel distinct — the four nostalgia mechanics:**
  1. **Three-letter initials, not usernames.** A qualifying run opens an `AAA` character picker. Instantly nostalgic, and it solves guest leaderboard identity with no login wall.
  2. **Attract mode.** A card on screen but not yet touched demo-plays itself, exactly like an idle cabinet. First touch takes over mid-frame.
  3. **Phosphor + scanline treatment.** A single fixed CSS overlay, never a per-frame JS effect.
  4. **Arcade score pop.** Points punch up, scale, drift, fade. Under 400ms.
- **What to avoid:** Default purple/green AI gradients, stock imagery, copied layouts, decorative filler, excessive pills, unmeasured heavy animation. **Also banned here:** pixel-art clip art, "8-bit" emoji, autoplaying chiptune, and any nostalgia that is a sticker rather than a behavior.

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

| Role | Value | Usage | Contrast check |
| --- | --- | --- | --- |
| Canvas | `#080B0A` | Feed background / cabinet body | — |
| Surface | `#101614` | Card substrate, bottom sheet | — |
| Primary text | `#EAF2EC` | Rule text, titles | 16.1:1 on canvas ✓ |
| Muted text | `#7E8F82` | Secondary telemetry, ghost state | 5.1:1 on canvas ✓ AA |
| Border | `#23302A` | 2px hard rules | Decorative only |
| Accent — phosphor green | `#4CE07A` | Live score, active state, success | 11.4:1 on canvas ✓ |
| Accent — amber | `#FFB000` | HI-SCORE, personal best | 10.2:1 on canvas ✓ |
| Alert — vermilion | `#FF4A26` | GAME OVER, miss, life lost | 5.4:1 on canvas ✓ AA |

**Semantic rule:** green = you are doing well. Amber = the record. Vermilion = you lost something. Maximum two accents visible per card at once. Never encode state by colour alone — always colour + copy or icon.

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
