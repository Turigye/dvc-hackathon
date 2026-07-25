# Switchback — Mechanic Respec

> **Claude, creative direction. Supersedes the three-lane implementation.** The user played the current blockout and correctly described the entire game in one sentence: two hazards spawn, one lane is open, you move to it. Not editing `simulation.ts` — Codex holds the lock. This is the design to build against.

## What went wrong

The simulation has no path in it. State is `lane: -1 | 0 | 1` plus a vertical position; the zigzag ribbon is a background image the game never references. Three lanes with one guaranteed opening per row is structurally **the same game as LCD Run**, which the user already rejected as generic.

Two specific design faults:

1. **One safe lane per row.** `hazardLanes = LANES.filter(l => l !== safeLane)` means every row has exactly one correct answer. No choice, no risk, no read — just move to the gap.
2. **Pickups spawn in the safe lane.** The reward marks the solution. Rewards must sit where the risk is, or they are not rewards.

## The core idea: the ribbon is the play space

The runner is locked to the zigzag and always moving along it. The ribbon is wide enough for **two rails — inside and outside**.

**One control. Tap swaps rails.**

**The mechanic that makes it Switchback:** at every vertex, inside and outside *swap*. Hold the inside rail through a corner and you come out on the outside. So the same input means different things depending on where you are in the zigzag, and mastery is knowing whether to tap *before* or *after* a corner. That is what the word means, it is what the poster draws, and it is not a mechanic the player has seen before.

This also restores the poster's promise — `TAP TO FLIP`, one control — instead of the two-button left/right that made it generic.

## Hazards — randomised, telegraphed, varied

Never "one opening per row." Each hazard picks a rail, a position within the segment, and a type, all seeded-random and weighted by score.

| Type | Behaviour | What it tests |
| --- | --- | --- |
| **Piston** | Slams onto one rail, telegraphed ~500ms ahead by a falling shadow | Timing |
| **Spike run** | Occupies one rail for a whole segment | Committed positioning — you must be on the right rail *before* entry |
| **Sweeper** | Crosses both rails mid-segment | Pure timing — position alone cannot save you |
| **Gap** | A missing chunk of one rail | Reading ahead |

Mix them. A segment may hold zero, one, or two hazards. Zero is important — dead air is what makes the busy segments read as spikes in intensity.

## Risk and reward — the missing layer

The current build has no reason to do anything but survive. Add one:

- **Near-miss bonus.** Passing within a hair of a hazard scores extra and builds a combo. This is the `+1` burst the poster draws at the point of impact. Now hugging danger pays.
- **Coins sit on the risky rail**, never the safe one. Invert what is currently built.
- **Combo breaks on a safe, wide pass.** Playing it safe costs you the multiplier — that is the tension.

## The pursuer — user's idea, adopted

A pursuer travels the same ribbon behind the runner. It wakes at score 8, starts ~3.2 segments back, and **closes steadily on its own**. If it reaches you, the run ends with `CAUGHT`.

The important part is not the pressure — it is what it does to the scoring economy. **Risk pushes it back:** a near miss buys 0.42 segments, a coin 0.22, a boost 0.9. Nothing else does. So a player who only survives is on a timer they cannot see off, and the only way to keep running is to keep taking chances.

This makes the risk layer mandatory rather than optional, which was the deepest problem with every previous version of this game. Playing safe is now the losing strategy, by construction.

The gap is capped at 4.2 segments so the pursuer is always on screen or just off it — never forgotten.

## Power-ups — exactly two

- **Shield** — absorbs one hit, visible as a ring on the runner.
- **Boost** — speed up, score multiplier, hazards still lethal. A genuine risk, not a free ride.

No more than two. Every additional pickup costs spawn logic, duration state, visual language and balance time.

## Fairness rules — non-negotiable

1. At least one rail is always survivable at every point along a segment.
2. **Reachability:** given the runner's current rail, speed and position, compute the latest possible tap that clears the hazard. If that moment has already passed when the hazard spawns, do not spawn it. A death the player could not have avoided reads as broken, not hard.
3. Corner-swap must never itself be lethal — the player must always be able to survive a corner by doing nothing, so the corner is a *decision*, not a trap.
4. Telegraph everything. Nothing lethal appears with less than ~450ms of warning at current speed.

## Difficulty

Ramp speed and hazard density with score. Introduce types progressively: pistons only for the first ~10 points, spike runs from ~10, sweepers from ~25, doubles from ~40. A new player should survive twenty seconds; a good one should be alive at two minutes.

## Acceptance — how we know it is fixed

- [ ] The runner is visually and logically **on** the ribbon; the path is simulated, not decorative.
- [ ] The player cannot describe the game as "move to the open lane."
- [ ] Two consecutive runs produce visibly different hazard patterns.
- [ ] There is a reason to take a risk, and taking it is scored.
- [ ] Deterministic test: a scripted input sequence proves reachability holds for 500 spawned hazards at max speed.
- [ ] The user plays the blockout and wants another run without being asked.

That last one is the only acceptance criterion that actually matters.
