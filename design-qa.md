# Switchback Design QA

- Source visual truth: `/Users/turigyemicheal/Downloads/Generated image 2.png`
- Implementation screenshot: `/tmp/tip-tap-switchback-mobile-running-final.png`
- Side-by-side comparison: `/tmp/switchback-design-comparison.png`
- Viewport: 390 × 844 CSS px
- Source pixels: 853 × 1844; normalized to 390 × 844 for comparison (2.187× source density)
- Implementation pixels: 390 × 844 at 1× capture density
- State: active running state, score advancing, obstacles and pickup visible
- Full-view comparison: inspected side by side at a shared 780 × 844 canvas
- Focused regions: no separate crop required; the path, runner, hazards, HUD, and lower control/title area are legible at the normalized full-view size

## Findings

No actionable P0, P1, or P2 findings remain for this mechanics checkpoint.

- Typography: the implementation retains cream display numerals, amber high-score telemetry, and compact mono support copy. The giant source wordmark is intentionally represented by the feed-owned title so gameplay keeps the upper horizon visible.
- Spacing and layout: the road, runner, hazards, HUD, action rail, title, leaderboard, and swipe cue remain inside a 390 × 844 card without horizontal overflow or overlap.
- Colors and tokens: near-black is the field, cobalt is the playable road, vermilion is exclusively hazardous, amber is reward/boost, and cream is player/type.
- Image and asset fidelity: the supplied poster is the art-direction reference. Moving gameplay geometry remains code-native per `CODEX-BRIEF.md`; interface/game symbols use the required tree-shaken Phosphor icon set. No stock assets were introduced.
- Copy: controls now say “Tap left or right to steer,” with a short first-run explanation of hazards and pickups.

## Intentional Adaptations

- The poster's static zigzag ribbon is converted into a perspective three-lane scrolling road. This follows the user's latest Subway-Surfers-style endless-runner direction while preserving the cobalt path, red falling hazards, fixed cream runner, and amber payoff language.
- The runner stays near the bottom of the viewport while the road and obstacle rows move toward it; this replaces the earlier off-path vertical marker behavior.

## Comparison History

1. Initial user play pass: P0 interaction failure, runner visibly left the path, obstacles flashed laterally, instructions were unclear, and the screen chrome overlapped gameplay.
2. Mechanics rebuild: introduced a fixed runner, perspective road, descending parameterized hazards, left/right lane input, guaranteed safe lanes, shield/boost/coin pickups, and a continuous score/difficulty model.
3. Browser pass: found start instructions returning behind the game-over sheet; changed the instruction state to render only before the first run.
4. Final browser pass: 390 × 844 card and stage measured exactly; right input moved the runner from x=172 to x≈239 and left input returned it to x=172; visible rAF advanced score to 017; no framework overlay or console warning/error remained in a fresh tab.

## Follow-up Polish

- P3: add the approved screen-print grain tile and condensed wordmark during the dedicated art pass.
- P3: add impact particles and a stronger boost trail after the user confirms physical-phone steering feel.

## Final Result

final result: passed
