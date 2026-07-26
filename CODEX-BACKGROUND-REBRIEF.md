# Codex — background re-brief (4 rejected)

**Rejected:** `background-switchback`, `background-pulse`, `background-reflex`, `background-color-rings`.
**Keep as-is:** Skyline, Overload, Swarm, Slice — those work.

## Why these four failed

All four made the same mistake: **they painted the game's own mechanic.**

| Game | What you drew | Why it breaks |
| --- | --- | --- |
| Switchback | An isometric zigzag ribbon | The game *is* a zigzag ribbon. Two ribbons on screen, and the player cannot tell which one they are running on. |
| Pulse | A perspective tunnel with a vanishing point | The game is a flat 2D side-scroller. The tunnel implies motion *into* the screen while gates move *across* it. The perspective fights the gameplay. |
| Reflex | Concentric arcs and tick marks | The game is a dial made of concentric arcs. The background rings read as extra hands and target zones. |
| Color Rings | Concentric coloured rings | The game is literally concentric coloured rings. Total collision — background elements look like gates you can pass through. |

Two further problems on all four:

1. **The centre is the busiest part.** Gameplay lives in the middle 60% of the card. Detail there competes with the thing the player must read.
2. **Composed square-ish, then cover-cropped.** The card is 9:19.5. Anything not composed at that ratio gets stretched or has its subject cropped out.

## Rules for the re-do

1. **Never depict the mechanic.** The background is the *place the game happens in*, not a picture of the game. If a player could mistake a background shape for a gameplay object, it is wrong.
2. **Quiet centre, detail at the edges.** Keep the central vertical band — roughly 55% of the width and 65% of the height — low-contrast and near-empty. Push structure to the top, bottom and outer margins.
3. **Compose at 1080×2340 exactly.** Portrait 9:19.5. Assume a `cover` crop with a few percent of bleed on every side.
4. **Low contrast overall.** These sit at 20–50% opacity behind live gameplay. Aim for a dark, tonal image with one accent colour, not a full-strength poster.
5. **No horizon lines, no vanishing points, no perspective floors** unless the game itself is in perspective. None of these four are.
6. Keep the screen-print grain and flat-vector language. That part was right.

## New prompts

### background-switchback.webp — cobalt / amber
> Vertical 1080x2340 game background. Abstract art-deco cityscape at night seen from high above, deep indigo and cobalt tower blocks arranged around the outer edges, the entire central vertical band left dark, empty and low contrast. Scattered small amber dots and thin vertical light streaks near the margins only. Flat vector, screen-print grain, no roads, no ribbons, no zigzags, no paths, no perspective floor, no text.

### background-pulse.webp — electric blue / yellow
> Vertical 1080x2340 game background. Flat abstract field of soft horizontal light bands in electric blue on deep navy, like distant atmosphere layers, densest at the very top and very bottom, fading to near-black across the middle. A few small yellow particles drifting near the edges. Completely flat with no depth, no tunnel, no vanishing point, no perspective, no rings, no gates, no text.

### background-reflex.webp — ember orange / cream
> Vertical 1080x2340 game background. Warm ember orange and burnt red gradient field with soft cloudy tonal texture and heavy paper grain, darkest through the centre, subtle diagonal cream hairlines only in the top and bottom corners. Completely free of circles, rings, arcs, dials, tick marks and radial patterns. Abstract, flat, mid-century printed texture, no text.

### background-color-rings.webp — deep navy / multicolour
> Vertical 1080x2340 game background. Deep navy field with a scattering of small flat confetti rectangles and dots in cyan, magenta, lime and yellow, concentrated along the left and right margins and the very top and bottom, leaving the central column almost empty. No circles, no rings, no concentric shapes, no arcs. Flat vector, screen-print grain, playful, low contrast, no text.

## Acceptance

Before committing, place each image behind its live game at the opacity in `globals.css` and confirm:

- [ ] No background shape can be mistaken for a gameplay object.
- [ ] The centre of the card is quiet; the player's eye goes to the game.
- [ ] Nothing is stretched or has its subject cropped at 9:19.5.
- [ ] Manifest entry updated with the new prompt.

Replace the files in place — the paths are already wired in `globals.css` via `.card-art`.
