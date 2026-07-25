# DVC Hackathon Operating Manual

## Mandate

Build a complete, usable, visually original web application from the official live brief. Optimize for the judging criteria: working functionality, usability, execution quality, completeness, and fidelity to the brief.

## Autonomous execution

- Perform available actions directly: inspect the codebase, install project dependencies, run development servers, execute tests, use browser verification, and create local Git checkpoints.
- Do not ask the user to run commands that can be safely run in this workspace.
- Stop only for a true product decision, missing credential, external approval, or an action outside the stated scope.

## Required build order

1. Read `HACKATHON_CONTEXT.md`, this file, and `design.md`.
2. Translate the live brief into a user journey, primary conversion/action, acceptance criteria, and build sequence.
3. Complete `design.md` before meaningful product UI work.
4. Build the smallest complete working path first, then add differentiated polish.
5. Validate in a local browser on desktop and mobile after each meaningful UI milestone.
6. Run production build, lint, typecheck, performance trace, and public deployment smoke test before submission.

## Mini-game skill activation

The following globally installed skills teach reusable workflows; this file remains the source of truth for Tip Tap's product contract, repository structure, score APIs, and deployment choices. Use only the skills relevant to the current milestone, and announce their use before acting.

| Skill | Invoke when | Required outcome |
| --- | --- | --- |
| `open-source-game-port-auditor` | Before adapting any external game, library, assets, or source code | Licence/attribution decision, reusable mechanic boundary, and integration-risk report before code import. |
| `mini-game-vertical-slice` | Creating, replacing, or porting a playable game | Placeholder-first complete loop: active start, input, score, end once, restart, off-screen teardown, clean re-entry. |
| `game-input-and-feed-gestures` | A mechanic uses touch, drag, hold, horizontal movement, or pointer capture | Feed/game gesture ownership verified with vertical swipe preserved as escape. |
| `mini-game-playtest-debugger` | Before claiming a game or game change works | Real pointer browser playthrough, portrait viewport checks, lifecycle repeat test, screenshot/console evidence. |
| `procedural-game-balance` | An endless/repeatable game generates hazards, pickups, score multipliers, or difficulty | Seeded fairness/reachability tests and documented progression curve. |
| `game-feel-and-juice` | The verified gameplay loop needs tactile, visual, haptic, or audio polish | Event-led feedback that improves clarity and replay without hiding hazards or harming responsiveness. |
| `mobile-canvas-performance` | A playable game risks stutter, memory growth, heat, or lifecycle leaks | Measured mobile performance and teardown audit; no duplicate loops, listeners, audio, or rising memory across card cycles. |
| `game-asset-integrator` | Replacing placeholder geometry with visual/audio assets | Original/licensed asset manifest, compressed/preloaded assets, retained gameplay geometry, and mobile-safe fallbacks. |

Default sequence for a new external-mechanic game: audit source -> build vertical slice -> resolve gestures -> playtest -> balance -> add feel -> optimize -> integrate assets -> regression playtest. Do not run later phases before the previous phase has passed its stated outcome.

## Design system and references

- `design.md` is the source of truth for typography, color, spacing, component geometry, contrast, responsive behavior, and motion.
- Use `@phosphor-icons/react` exclusively for interface icons. Import only the icons actually rendered; do not add another general-purpose icon library.
- Use design references as inspiration for a documented idea, never as a layout or code to reproduce. See `DESIGN_RESOURCES.md`.
- Avoid generic AI design signals: default purple/green gradients, undifferentiated bento grids, excessive pills, filler metrics, copied layouts, and cosmetic motion.
- Use shadcn-compatible primitives selectively. Audit every third-party component for accessibility, responsive behavior, bundle cost, and design-system fit before adding it.

## Images and assets

- Keep accepted project imagery in `public/assets/`; do not reference generated files from outside the repository.
- Use the built-in image generation workflow for project imagery. Generate bespoke illustrations for non-hero landing-page images; do not use stock imagery.
- Save a concise asset manifest entry with the prompt, usage, source/derivative status, dimensions, and format for every accepted generated asset.
- Use AVIF/WebP for opaque images where practical. Use transparent PNG/WebP only when alpha is needed.
- For transparent assets, use chroma-key generation and local alpha validation first. Ask before switching to the CLI native-transparency fallback.
- Treat hero imagery as a brief-specific decision. Do not generate it until the product direction is approved.

## Performance and quality gates

- Prefer Server Components; add client boundaries only for browser interaction or browser APIs.
- Use `next/font`, `next/image`, responsive `sizes`, route-level loading boundaries, and dynamic imports for expensive client-only modules.
- The LCP asset must be present in HTML, high priority, correctly sized, and never lazy-loaded.
- Lazy-load below-the-fold media. Keep animation purposeful, compositor-friendly, and disabled/reduced when `prefers-reduced-motion` is set.
- Record a Core Web Vitals trace before final submission. Target LCP <= 2.5 seconds; inspect the LCP breakdown before changing assets or code.
- Verify keyboard navigation, visible focus, semantic labels, contrast, loading/error/empty/disabled states, responsive layouts, no framework overlay, and console health.

## Git and deployment

- Create local commits after scaffold, design system, primary flow, product completion, visual polish, and submission readiness.
- Never commit secrets, `.env*` files, build output, generated temporary files, or source assets without their manifest entry.
- Use the Sites/deployment workflow only for final publishing and shareable URL generation, never as a shortcut for initial UI design.
- Before submitting, create a judge packet containing the public URL, repo URL, test credentials/data if applicable, demo script, and feature summary.
