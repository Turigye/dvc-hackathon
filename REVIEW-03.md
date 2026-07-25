# Review 03 — Claude (lead), played in browser at 375×812 on `4fce984`

**User rating: 2/10 on all three games. I agree, and it is not the mechanics — it is that none of them were finished.** The three specs in `GAMES.md` were implemented as logic only. The CSS was never written, and every game loop is being destroyed and rebuilt continuously. What is on screen is not a playable version of these games.

This review is from actually running the app, not reading it.

---

## R-1 — ROOT CAUSE: every game loop restarts on every render

This one defect explains most of why the games feel dead, jittery and unresponsive. Fix it first.

In `tip-tap-arcade.tsx:59-61` the callback is constructed inline:

```tsx
<BurnIn active={…} onFinish={(data) => void submit(game.slug, data)} />
```

That arrow is a **new function identity on every render**. It is then listed in the dependency array of every game's loop effect:

- `SignalLock` — `[active, onFinish]`, and the loop calls `setTuner`/`setScore`/`setMeter` *every animation frame*. Each of those re-renders the parent, which creates a new `onFinish`, which tears down and re-creates the `requestAnimationFrame` loop. The loop is being destroyed and rebuilt roughly sixty times a second, and `previous = performance.now()` resets on each rebuild, so every `dt` is garbage.
- `LcdRun` — `[active, onFinish, running]`. Same pattern: each tick calls `setObstacles`/`setScore`, which re-renders, which cancels the pending `setTimeout` and schedules a fresh full-length one. The tick interval is effectively random rather than the specified 520ms → 180ms ramp.

**Fix:** wrap the per-game callbacks in `useCallback` keyed on the slug — or better, hoist a stable `handleFinish` that takes the slug as its first argument and pass `slug` as a separate prop. Then remove `onFinish` from the dependency arrays entirely and hold it in a ref. A game loop must be started and stopped **only** by `active`, never by a render.

## R-2 — Eleven CSS classes are referenced in JSX and never defined

`globals.css` is still 37 lines and still describes the deleted Beat Drop / Slipstream / Blinkstack UI. I enumerated every class the new components emit and checked it against the loaded stylesheets. All of these resolve to nothing:

```
burn-grid  four  lcd-board  lcd-course  lane  lcd-obstacle
lcd-runner  signal-board  signal-rail  phosphor  lcd  cobalt
```

`phosphor`, `lcd` and `cobalt` are the `accent` values from `games.ts` applied to `.game-card` — so every card's accent class is dead, and the games are rendering inside leftover styles built for entirely different mechanics. Consequences visible on screen:

- **Burn-In** renders a 9-cell grid into `.tile-grid { grid-template-columns: 1fr 1fr }` — a leftover from the old 4-tile game. Nine cells stack as **two columns and five rows, with the ninth orphaned**, spilling outside the stage. At level 5 it switches to 16 cells and gets worse.
- **LCD Run** has no visible lanes. The three `.lane` elements are unstyled and render at zero width. The vertical stripes you can see are the old `.course` background gradient, and they **do not line up with the three logical lanes**. Obstacles inherit `.hazard` — a 44%-wide amber block with a 5px red offset shadow — which is neither a lane-width obstacle nor anything resembling an LCD segment.
- **Signal Lock** sits in the right half of the stage with a large dead column on the left, because it inherited `.beat-board`'s two-column grid.

## R-3 — Signal Lock reads the wrong axis

`tip-tap-arcade.tsx:92`. The rail is vertical: `.timing-rail` is a tall column, and both `.marker` and `.target-zone` are positioned with `top`. But `move()` computes the value from **`event.clientX` and `rect.width`** — the horizontal axis.

The player drags left-to-right and a bar moves up-and-down, across a rail whose width is a fraction of its height, so the entire 0–100 range is compressed into a narrow horizontal band. This is the single worst feel problem in the build and it is a one-line fix: use `clientY` and `rect.height`, or rotate the rail to be horizontal and keep `clientX`.

Related: the element has `role="slider"` with `aria-valuenow`, but no keyboard handler — arrow keys do nothing.

## R-4 — Every card overflows the viewport, so the feed is not one-card-per-screen

Measured in the live page at 375×812:

| Card | Height | Overflow |
| --- | --- | --- |
| `burn-in` | 971px | **+159px** |
| `lcd-run` | 911px | **+99px** |
| `signal-lock` | 905px | **+93px** |

Because `.game-card` stacks title + stage + leaderboard + swipe cue and the leaderboard is *inside* the card, the content exceeds `100dvh`. Scroll-snap then fights the user: you land mid-card, see a game with the board cut off below the fold, and a swipe does not cleanly advance. The DoD row reads *"Swiping up or down moves exactly one full-screen card."* It currently does not.

**Fix:** the leaderboard must not consume vertical flow inside the card. Collapse it to a compact rail entry — rank + your best — and open the full board as an overlay sheet on tap. `design.md` already specifies exactly this: *"Expands in-card; never navigates away."* Target: stage fills the space between the title and the safe-area bottom, card height locked to `100dvh` with `overflow: hidden`.

## R-5 — The seeded leaderboard shows the same player repeatedly

Visible in both screenshots: `1AD` appears at ranks 04 and 05 with different scores. `memoryLeaderboard` in `score-store.ts` sorts raw scores and slices the top 10 **without deduplicating by player** — the Supabase path does dedupe, the memory path does not. Every run you complete adds another row of yourself.

`1AD` itself is the naming bug from `REVIEW-02` P2-2: `deviceId.slice(0,3).toUpperCase()` against a UUID. This disappears the moment three-letter initials land, which is now the higher-value fix.

## R-6 — Still no CRT tokens, second time

`globals.css:3` remains `--ink:#07101e` with cobalt and vermilion. The approved phosphor palette in `design.md` has now been specified twice (`REVIEW-01` P2-2) and not applied. The wordmark is still red-offset editorial, not arcade.

Nothing on screen currently reads as nostalgic. There is no scanline, no phosphor glow, no attract mode, no initials, no machine-voice failure state. **All four nostalgia mechanics from `design.md` are absent** — which is why the user's read is that these are generic mini-games. The concept's entire differentiation is missing, not deferred.

## R-7 — Fairness: LCD Run can spawn unavoidable walls

`tip-tap-arcade.tsx:82`. Past 30 ticks, density becomes 2 and spawns at `(random + index) % 3`, which can place obstacles in two of three lanes on the same row. The player can only move **one lane per tap, cycling 0→1→2→0**, so a two-lane wall arriving while the runner is in the third lane may be unavoidable depending on phase. Deaths that the player could not have prevented read as broken, not hard.

**Fix:** guarantee at least one open lane per row, and make the open lane reachable from the current lane. Reachability is the real constraint given cyclic movement.

---

## What I am asking for, in order

Everything above the line is required before this is demoable. Do not start attract mode or initials until R-1 through R-4 are committed.

1. **R-1** — stabilise `onFinish`; game loops keyed on `active` only. *Nothing else matters until this is done.*
2. **R-2** — write the actual CSS for all eleven classes. Burn-In grid must be a true 3×3 that becomes 4×4; LCD Run needs three visible lanes with obstacles at lane width; Signal Lock needs a full-stage rail.
3. **R-3** — Signal Lock reads `clientY`/`rect.height`, plus arrow-key support.
4. **R-4** — card locked to `100dvh`; leaderboard becomes a rail summary plus an overlay sheet.
5. **R-6** — apply the phosphor tokens from `design.md`. This is the third request.
6. **R-5** — dedupe `memoryLeaderboard` by player.
7. **R-7** — guarantee a reachable open lane.

Then, and only then: three-letter initials → attract mode → endless feed.

## Note on process

Three reviews in, `design.md` has not been applied once. If the direction is wrong, say so in `Open questions` and I will change it — that is a legitimate move and I would rather have the argument than the silence. What does not work is implementing the logic and skipping the presentation layer, because on this brief the presentation layer *is* the product. A judge plays for fifteen seconds; they never read `score-persistence.ts`.
