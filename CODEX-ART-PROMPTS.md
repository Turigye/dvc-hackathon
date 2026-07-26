# Codex art brief — Thumbtrance

Use the image-generation skill. **Read `CODEX-CATCHUP.md` first.** Claude owns `globals.css` and is working on the intro screen, menu and pause — take a lock in `COORDINATION.md` before touching either.

## House rules for every asset

- **No stock, no third-party packs.** `AGENTS.md` bans them and originality is scored.
- Portrait **1080×2340**, or **1024×1024** for tiles and icons.
- Export **WebP** (opaque) or **PNG** (alpha). Log every accepted asset in `public/assets/manifest.md`: prompt, usage, dimensions, format, licence status.
- **Nothing raster on the LCP path.** Games stay code-drawn; art is background, texture, iconography and covers.
- Bright and saturated. We moved off near-black deliberately — the app should feel joyful, not grim.
- Every game keeps its own colour world. Do not homogenise them.

## Per-game prompts

Blockout CSS classes to dress are listed with each. Replace the *look*, never the geometry — collision and layout come from the simulation.

### 1. Switchback — cobalt / amber
> Vertical mobile game background, isometric zigzag ribbon road folding back on itself down a dark indigo void, thick cream painted edges, deep cobalt road surface, sparse dark-blue dash markings, subtle halftone grain, screen-printed poster texture, vivid and high contrast, no text, no characters.

Classes: `.ribbon`, `.ribbon-wall`, `.rail-line`, `.centre-stripes`, `.vertex`, `.hazard.is-piston/.is-spikes/.is-sweeper`, `.drag-band.is-drag/.is-sprint`, `.pickup.*`, `.runner`, `.chaser`.

### 2. Skyline — magenta / cyan
> Vertical mobile game background, neon skyline of stacked glass towers at dusk, hot magenta and cyan gradient sky, silhouetted city, soft grain, flat vector poster style, joyful and bright, no text.

Classes: `.stack-well`, `.stack-block`, `.stack-mover`, `.stack-shard`.

### 3. Pulse — electric blue / yellow
> Vertical mobile game background, glowing energy tunnel receding into electric blue depth, concentric light rings, warm yellow highlights, retro-futuristic arcade poster, high saturation, clean flat shapes, no text.

Classes: `.pulse-gate .is-blocked`, `.pulse-bird`.

### 4. Reflex — ember orange / cream
> Vertical mobile game background, giant analogue dial face, warm ember orange and burnt red, cream tick marks, subtle paper grain, mid-century instrument panel poster, bold and clean, no text.

Classes: `.dial-track`, `.dial-arc`, `.dial-hand`, `.dial-decoy`, `.dial-hub`.

### 5. Overload — toxic lime / white
> Vertical mobile game background, glowing reactor core column, toxic lime green and white energy, warning stripes, industrial sci-fi poster, high contrast, flat vector, no text.

Classes: `.core-track`, `.core-band`, `.core-fill`.

### 6. Swarm — violet / pink
> Vertical mobile game background, deep violet field with drifting bioluminescent motes, soft pink accents, dark nebula, playful and calm, flat illustration, no text.

Classes: `.bug`, `.bug.is-bad`.

### 7. Slice — mint green / yellow
> Vertical mobile game background, fresh mint green gradient with soft geometric confetti shapes, bright yellow accents, energetic and clean, flat vector poster, no text.

Classes: `.slice-shape`, `.slice-shape.is-bomb`, `.slice-half`, `.slice-trail polyline`.

### 8. Color Rings — electric cyan / magenta
> Vertical mobile game background, concentric neon rings in cyan magenta lime and yellow on deep navy, kinetic op-art poster, high saturation, flat vector, no text.

Classes: `.ring`, `.rings-ball`.

## Menu tiles

Eight square **1024×1024** tiles, one per game, in that game's colour world. Each should read as a tiny abstract emblem of its mechanic — a folded ribbon, a stacked tower, a gate, a dial, a core, a swarm, a blade, a ring. Flat vector, thick cream outline, poster grain. No text; the menu supplies names.

## Logo

> Bold condensed sans wordmark reading THUMBTRANCE, screen-printed poster texture, cream letterforms with a hard vermilion offset shadow, deep indigo background, slight grain, retro arcade cabinet feel, high contrast, square composition.

Deliver: `logo.webp` (transparent PNG variant too), a 512×512 icon crop, and a 1200×630 OG image.

## Submission cover

> Vertical 9:16 poster for a mobile arcade app called THUMBTRANCE. A phone-shaped vertical feed with eight bright mini-game cards stacked and receding into the distance, each card a different saturated colour world — cobalt, magenta, electric blue, ember orange, lime, violet, mint, cyan. A thumb reaching in from the bottom edge. Bold condensed cream title THUMBTRANCE across the top with a hard vermilion offset shadow. Screen-printed poster texture, halftone grain, high contrast, joyful and energetic, no photorealism, no small illegible text.

Deliver `public/assets/submission-cover.webp` at 1080×1920 and a 1200×630 crop for OG.
