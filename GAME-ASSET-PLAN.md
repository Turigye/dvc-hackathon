# Thumbtrance gameplay asset plan

This file maps generated art to the live product and prevents decorative imagery from becoming game logic. All collision, hit areas, paths, timing windows, and scoring remain code-native.

## Where the existing 16 game images go

| Set | Files | Placement | Load policy |
| --- | --- | --- | --- |
| Eight menu tiles | `public/assets/menu-<slug>.webp` | Retro game-select menu only. Each tile is the mechanic emblem behind the game name/high score. | Load with the menu after the CSS boot screen; never use inside a game stage. |
| Eight game backgrounds | `public/assets/background-<slug>.webp` | Decorative world layer behind the code-drawn stage for the matching game. | Load only when that game is selected/active; keep the existing CSS colour world as the instant fallback. Never preload all eight and never derive collision from them. |

The cover, logo, icon and OG crops are campaign/identity assets, not part of this 16-image gameplay set.

## Foreground kit contract

Each game gets an original transparent sprite atlas plus individually exported sprites. Every kit uses the existing kinetic-poster language—flat screen-print shapes, thick cream keylines, saturated game-specific colour, compact halftone texture, strong silhouettes—and avoids stock art, recognizable third-party characters, tiny text, or baked UI.

| Game | Playable identity | Hazards / targets | Rewards / feedback |
| --- | --- | --- | --- |
| Switchback | Courier runner poses; shadow pursuer | Piston, spike cluster, sweeper | Coin, shield, boost; near-miss burst |
| Skyline | Magnetic builder drone; glass blocks | Moving/misaligned block | Perfect-fit flash, height beacon, cyan/magenta/cream shards |
| Pulse | Four-phase pulse bird | Honest gate cap, liar/glitch gate cap | Energy trail, feather spark, impact burst |
| Reflex | Precision hand/needle as the playable identity | Target arc, decoy hand, dial ticks | Hub, perfect burst, miss burst, streak flame |
| Overload | Reactor operator bot; calm/charged core | Safe/warning bands | Overcharge burst, sparks, heat bolt |
| Swarm | Four friendly bioluminescent bugs | Predator bug; breeding pair | Lure, pop burst, life mote |
| Slice | Four geometric fruit-creatures; swipe blade | Bomb | Split halves, juice star, combo slash |
| Color Rings | Four colour-state player orbs | Ring segment set | Match burst, mismatch burst, chroma trail |

## Integration rules for Claude

1. Keep current CSS/SVG shapes as fallbacks and as the authoritative geometry.
2. Treat each transparent sprite as visual content inside the existing measured element; do not size hit areas from image bounds.
3. Preload only the active game's essential player/hazard sprites. Lazy-load its decorative background and feedback effects after first interaction.
4. Pause all sprite animation with the game lifecycle and `prefers-reduced-motion`.
5. Validate at 390×844 and desktop, including hidden-tab pause, first-play without cached assets, and a failed-asset fallback.

## Priority queue

1. Generate, isolate, optimize, and manifest the eight foreground kits.
2. Claude integrates one kit at a time without changing simulation geometry; Switchback is the visual-quality benchmark.
3. Real-phone playtest with sound, touch, pause/resume, and all eight games.
4. Fix challenge links so the game and score-to-beat deep-link correctly.
5. Run a real Google/Discord OAuth round-trip and confirm guest-score merge.
6. Harden the score endpoint against trivial score spoofing.
7. Production performance pass: active-game asset loading, memory, LCP, and console/overlay checks.
8. Final submission packet and public incognito smoke test.

## User decisions still needed

- Confirm the final spelling: `Thumbtrance` currently ships; `Thumbtrace` has also appeared in conversation.
- After the first integrated kit, approve whether the sprite treatment is expressive enough before Claude propagates it to all eight stages.
