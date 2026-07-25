# Game Mechanics — Tip Tap Games

> **Claude owns this file.** Three original mechanics, none from the brief's reference list. Each is nostalgic *because of how it behaves*, not how it's decorated. Implement against the `GameProps` contract in `COORDINATION.md`.

Three different input models on purpose: **tap-recall**, **drag-hold**, **rhythmic tap**. If two games feel the same in the thumb, one of them is wrong.

Build order: `burn-in` → `lcd-run` → `signal-lock`. The feed must work with one game; each additional mechanic is independently droppable.

---

## 1. BURN-IN — `src/games/burn-in/`

**Rule text (on card):** `Tap where it burned.`

A shape flashes at full phosphor brightness on the grid, then decays to a faint ghost and vanishes. Tap the cell where it was. Each round adds one more flash to the sequence before you answer — recall the whole chain, in order.

- **Why it's nostalgic:** CRT phosphor persistence *is* the mechanic. The decay curve is the gameplay, not a filter.
- **Loop:** flash sequence (n cells) → input phase → correct advances to n+1, wrong ends the run.
- **Difficulty:** decay time shortens from 900ms toward 260ms; grid grows 3×3 → 4×4 at round 6.
- **Score:** `round² × 10`. Big late rounds, so the board rewards depth not grinding.
- **Attract mode:** autopilot plays a flawless 4-round sequence, then deliberately misses and restarts.
- **Feel note:** the ghost must linger just long enough to feel *almost* readable. If recall is comfortable, it's too slow.

## 2. LCD RUN — `src/games/lcd-run/`

**Rule text (on card):** `Tap to switch lanes.`

Three lanes. Your marker sits at the bottom; obstacles advance toward you **one discrete step at a time**, on a fixed tick — never smoothly interpolated. Tap to hop lanes. Survive.

- **Why it's nostalgic:** Tiger Electronics handhelds could only light fixed segments, so everything moved in visible steps. We reproduce that constraint exactly: positions snap, they never tween. Off-cells render as low-alpha ghosts, like an unlit LCD segment.
- **Loop:** tick advances all obstacles one row; collision ends the run; each survived tick scores.
- **Difficulty:** tick interval 520ms → 180ms; obstacle density rises from 1 to 2 per row.
- **Score:** `+1` per tick survived, `+5` per near-miss (obstacle clears the lane you just left).
- **Attract mode:** autopilot survives ~20 ticks with visibly late dodges, then dies.
- **Feel note:** the step must be *audible* in the visuals — a hard snap, zero transition. Any CSS easing here kills the whole idea.

## 3. SIGNAL LOCK — `src/games/signal-lock/`

**Rule text (on card):** `Hold the signal.`

A tuning bar of static. Drag your thumb to move the tuner; a hidden target frequency drifts continuously. Keep the tuner inside the lock zone to accumulate signal strength. The target drifts faster as strength climbs.

- **Why it's nostalgic:** analog dial tuning — the hunt for a clear channel through static. The only game of the three that scores *continuously* rather than in discrete events.
- **Loop:** in-zone accrues score and narrows the zone; out-of-zone bleeds a signal meter; empty meter ends the run.
- **Difficulty:** drift speed scales with strength; lock zone narrows 18% → 6% of the bar.
- **Score:** `+2` per 100ms locked, ×2 multiplier past 3 seconds of unbroken lock.
- **Attract mode:** autopilot holds lock for ~6 seconds, loses it, recovers once, then drains.
- **Feel note:** static intensity is the feedback channel — clean and quiet in the zone, loud and noisy outside it. Render static as a cheap CSS/canvas noise field, not a per-pixel JS loop.

---

## Shared feel rules

- **First touch always takes over instantly**, mid-frame, from attract mode. Never a "tap to start" gate.
- **Failure is loud and immediate** — vermilion, `GAME OVER`, ≤180ms. No consolation copy.
- **A new personal best interrupts** with amber and `NEW HI-SCORE` before the initials sheet opens.
- **Initials sheet opens only on a qualifying run** — top 10 for that game, or any personal best. Otherwise the run ends straight back into playable state.
- **Every game is playable one-handed at 390×844**, with the entire interactive area inside the bottom 60% of the viewport. Nothing critical sits under the notch or above the thumb arc.
