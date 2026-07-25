# Game Mechanics — Tip Tap Games

> **Claude owns this file.** Supersedes the previous Burn-In / LCD Run / Signal Lock spec, which the user rated 2/10 — clever but not fun, and visually indistinguishable from each other.

Three mechanics chosen for **proven fun over invention**, each with a different input model. If two games feel the same in the thumb, one of them is wrong.

| Game | Input | Feel | World |
| --- | --- | --- | --- |
| Stack | Tap to drop | Precision, mounting tension | Magenta |
| Slice | Swipe to cut | Kinetic, messy, combo-driven | Acid |
| Color Rings | Tap to spin | Reflex, pattern reading | Electric |

Each is endless, one-thumb, and readable in two seconds. Any one can be cut without breaking the feed.

---

## 1. STACK — `src/games/stack.tsx`

**Rule text:** `Tap to drop.`

A block slides across the top of the tower. Tap to drop it. Whatever hangs over the edge is sliced off and tumbles away, so the tower narrows every turn. Miss entirely and the run ends.

- **Score:** 10 per block, +25 per **perfect** (a drop with no trim). Perfects chain into a visible combo.
- **Difficulty:** slide speed 38 → 126 units/sec.
- **Juice:** hue advances 13° per block, so the tower is a gradient that the player builds. Trimmed shards fall and fade. Perfect drops flash a combo pill.
- **Why it works:** the tension is self-inflicted — every block you place makes the next one harder. That is the whole game.

## 2. SLICE — `src/games/slice.tsx`

**Rule text:** `Swipe to cut.`

Shapes are lobbed up from the bottom of the screen. Swipe through them to cut. Cutting several in one unbroken stroke multiplies the score. Let three fall past you and the run ends.

- **Score:** 10 per shape × the current stroke multiplier. A four-shape stroke is worth far more than four separate cuts.
- **Difficulty:** spawn interval 1.5s → 0.52s; two shapes at once past 400 points.
- **Juice:** a glowing swipe trail follows the finger; every cut splits the shape into two halves that spin apart and fade. Lives are three dots that go dark.
- **Why it works:** the combo rule rewards greed — waiting for a second shape to line up is a real decision made under time pressure.

## 3. COLOR RINGS — `src/games/color-rings.tsx`

**Rule text:** `Spin to match.`

The ball falls through a column of four-colour rings. Tap to spin the next ring so the segment the ball passes through matches the ball's colour. The ball changes colour every time it clears a ring.

- **Score:** 10 per ring cleared.
- **Difficulty:** fall speed 20 → 52 units/sec.
- **Juice:** the ball pulses and recolours on every clear; cleared rings dim behind it.
- **Why it works:** it is a pure colour-matching reflex with a rotation puzzle layered on. The read is instant and the failure is always your own fault.

---

## Shared feel rules

- **No tap-to-start gate beyond the first input.** The first tap or swipe both starts the run and counts as the first move.
- **Failure is immediate and loud** — `GAME OVER`, the score at display scale, one primary action.
- **The game fills the card.** Chrome (title, rail, board strip) overlays it and never takes vertical flow.
- **Hard stop when the card is not active.** Cancel every rAF and timer — zombie loops across cards remain the likeliest bug.
- **One-handed at 390×844.** All interaction sits inside the thumb arc; nothing critical under the notch.

## Known gaps

- **Attract mode** is specced but unbuilt — an on-screen, untouched card should demo-play itself.
- **Three-letter initials** are unbuilt. Identity is still device-ID + optional Google.
- **Audio** is absent. Short synthesized WebAudio blips behind an explicit unmute would add a lot of juice for little cost.
- **Haptics** — `navigator.vibrate` on drop / cut / clear is a two-line win on Android.
