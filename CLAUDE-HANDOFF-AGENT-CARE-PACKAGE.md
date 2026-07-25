# Claude Handoff — Agent Care Package Review

**From:** Codex  
**For:** Claude, product and design lead  
**Status:** Decision and planning input only — do not begin a game-pack rewrite from this document alone.

## Why this exists

Mich supplied two versions of a Tip Tap Games agent care package and a [shared ChatGPT conversation](https://chatgpt.com/share/6a6540db-3954-83ea-8b4f-4dea1b3dfcff) titled **Codex Mini-Game Stack**. They want you to have the complete strategic context before the next product decision.

Source material:

- `/Users/turigyemicheal/Downloads/tip-tap-games-agent-care-package.md`
- `/Users/turigyemicheal/Downloads/tip-tap-games-agent-care-package.pdf` (23-page companion export)
- The shared conversation above. It contains the research progression, candidate/rejection reasoning, and the final recommended game pack. The Markdown care package is the clearest implementation-ready consolidation of that conversation.

## The product constraints that remain sound

Tip Tap is a portrait-first, TikTok-style snap feed of instantly playable mini-games. A player should land on an active game, understand the rule in about two seconds, play with one thumb, and vertically swipe to leave.

Non-negotiables:

- 390 × 844 is the primary viewport.
- No menu, account wall, or tutorial before play; one concise visible rule is enough.
- Active cards start; inactive cards fully stop. Re-entry must be clean.
- Each game needs repeatable/endless scoring, instant restart, a score event exactly once, and no ownership of global input/audio.
- Vertical feed navigation remains the escape gesture. Avoid using vertical swipe as the primary in-game control in the first release.
- Use original names, art, UI, audio, and visual language. Third-party repositories are mechanic references, not importable product shells.
- Confirm each source's current licence before importing any code; add required attribution and do not treat an unlicensed public repository as reusable.

## The care package's recommended game pack

| Priority | Game | Core interaction | Why it earns a slot |
| --- | --- | --- | --- |
| 1 | **Skyline** | Tap to place a moving block | Fastest polished vertical slice; precision, streaks, visible growth, one-more-run appeal. Rule: `Tap to stack. Perfect drops build your combo.` |
| 2 | **Containment** | Tap a hex cell each turn | The distinctive signature game: trap an escaping entity by removing cells. Rule: `Break the grid. Never let it escape.` |
| 3 | **Pulse Flight** | Repeated tap for vertical impulse | Reliable continuous reflex game, but only with an original phase/matching-gate twist. Rule: `Tap to rise. Pass through matching gates.` |
| Later | **Loop Hunt** | Claimed drag gesture | Strong capture mechanic, but defer until feed-vs-game gesture arbitration is proven on phones. |

The explicit rejection rationale also matters: generic runners, 2048, conventional Snake, and standard mobile Tetris either feel too familiar or compete with the feed's vertical swipe. A plain Flappy clone is not enough; the useful part is the tiny physics core, not the identity.

## Existing work versus this recommendation

The live project currently contains **Switchback, Slice, and Color Rings**. Switchback has recently been rebuilt around a two-rail zigzag ribbon, rail inversion at vertices, telegraphed hazards, risk/reward pickups, and a pursuer. That work is real progress and should not be discarded casually.

However, the care package makes a credible product-level challenge: **Switchback is technically richer but carries more explanation, balancing, and readability risk than Skyline.** It also directly argues that generic runners are not the best differentiator. The current ribbon mechanic is much less generic than a lane runner, but it still needs a real-phone fun test before it earns the first-card position.

This is the decision to make deliberately:

1. **Keep Switchback** only if a player immediately understands `Tap to flip`, wants another run, and the ribbon/rail swap creates visible decisions rather than confusion.
2. **Replace Switchback with Skyline** if we need the highest-confidence first game: it is more legible in one glance and creates a fast reference implementation for card lifecycle, scoring, restart, and mobile QA.
3. Irrespective of the first slot, **Containment is the strongest originality bet** for the final trio. It gives judges a strategic mechanic rather than another reflex-only card.
4. **Pulse Flight belongs only as a heavily differentiated third game** — phase gates, center-pass combos, and original presentation are required.

## Architecture guidance to retain

Do not introduce a second game framework or replace the current Next.js/React feed with the older Phaser + Vite idea from the shared conversation. The later care package correctly narrows that advice: adapt to the existing host and extract only pure, minimal game logic.

For any selected game:

- Keep simulation deterministic and separate from rendering.
- Use instance-owned state and delta-time-safe or fixed-step loops.
- Keep tunable values in typed configuration.
- Reuse the existing `GameProps` lifecycle contract rather than creating a competing runtime.
- Test pure rules (placement/overlap, pathfinding, collision, seeded generation) and browser-test activation, play, game over, restart, swipe-away teardown, and re-entry.
- Build placeholder geometry first; apply the art/feedback pass only after the loop is fun.

## Proposed decision checkpoint for Claude

Please review the current playable cards against this brief and record one binding decision in `COORDINATION.md`:

- **Chosen final three-game pack**, including whether Switchback is retained or Skyline becomes card one.
- The exact reason the chosen first game wins on immediate comprehension and replay desire.
- A strict scope cut: no fourth game until three cards meet lifecycle, mobile, and scoring acceptance criteria.
- Whether the current visual system is a shared Tip Tap shell with deliberately distinct game worlds, rather than one art treatment repeated everywhere.

No product code needs to change for this review checkpoint.

## Codex's view

I agree with the care package's overall thesis: three sharply differentiated mechanics will beat a broader but inconsistent arcade feed. My recommendation is **Skyline + Containment + a phase-gate Pulse Flight** if we are willing to pivot the game pack now. It offers the clearest portfolio: timing/precision, strategy, and continuous reflex.

If preserving work matters more than pivot speed, retain the redesigned **Switchback** only after a quick blind playtest proves its one-tap rail-swap mechanic reads instantly. In that version, I would still replace one of Slice/Color Rings with **Containment**; it is the piece most likely to make Tip Tap feel authored rather than assembled from familiar microgames.

The important anti-goal is a pack of polished-but-generic reflex games. The best submission is not the one with the most mechanics; it is the one where every card has a distinct, instantly legible reason to exist.
