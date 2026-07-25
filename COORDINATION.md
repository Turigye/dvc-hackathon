# Multi-Agent Coordination

Two agents work this repo concurrently: **Claude (lead / creative direction)** and **Codex (implementation)**. This file is the shared operational source of truth. Read it before editing shared files.

## Authority

| Domain | Owner | Rule |
| --- | --- | --- |
| Brief selection, scope cuts | Claude | Codex proposes, Claude decides. |
| `design.md` — creative direction, tokens | **Claude — exclusive write** | Codex must not rewrite this file. Raise disagreements as a note in `## Open questions` below. |
| Game mechanic design + feel | Claude | Codex implements the contract; mechanic invention is a direction call. |
| `src/` implementation | Codex | Claude reviews, does not race-edit the same file. |
| Schema, data layer, auth | Codex | Must stay within the three-table shape in the brief. |
| Dependencies | Codex | Anything that ships client-side JS needs a one-line justification here. |
| Deployment, submission packet | Claude | Codex supplies technical verification details and release evidence. |

## Start-of-work checklist

Before beginning a task, both agents must:

1. Read this file, including `In flight`, `Decision log`, `Handoff log`, and `Open questions`.
2. Run `git status --short` and inspect the last two commits with `git log --oneline -2`.
3. Confirm the work belongs to their owned area. If it crosses ownership boundaries, record a targeted question or a proposed decision before editing.
4. Lock every shared file before changing it.

## File locking convention

To avoid clobbering, **announce before editing a shared file** by adding a line under `## In flight`. Shared files: `design.md`, `AGENTS.md`, `README.md`, `package.json`, `src/app/globals.css`, `src/app/layout.tsx`, and `COORDINATION.md`.

Anything under `src/games/` is Codex-owned and needs no announcement.

- A lock must state the owner, exact files, intended change, and release condition.
- Do not edit an active lock held by the other agent. Record a question instead.
- After the change is validated and committed, clear the lock and write a Handoff log entry in the same checkpoint.
- If edits overlap unexpectedly, pause the overlapping work, preserve both changes, record the conflict in `Open questions`, and let the file owner choose the merge direction.

## In flight

_(empty — Switchback endless-runner checkpoint committed; production LAN preview remains on port 3000.)_

**Ownership change (user-directed, 2026-07-25 20:50 EAT):** Claude now owns the presentation layer outright — `globals.css`, card geometry, and the visual/feel layer of the game components. This supersedes the `src/` row in the Authority table for those files only. Game *logic*, data, auth and schema remain Codex-owned.

**Codex: notify Claude the same way.** Append a Handoff row for every checkpoint, and record disagreements in `Open questions` instead of building around them. If you need `globals.css` or the visual layer of `tip-tap-arcade.tsx`, take a lock here first and Claude will stay out.

## Decision log

Decisions here are binding. A later entry must explicitly name the decision it replaces.

| ID | Date | Decision | Owner | Status |
| --- | --- | --- | --- | --- |
| D-001 | 2026-07-25 | Claude owns product/design direction; Codex owns implementation, schema/auth, dependencies, testing, and Git operations. | User | Active |
| D-002 | 2026-07-25 | `COORDINATION.md` is the single shared coordination channel; locks, decisions, handoffs, and blockers are recorded here. | User | Active |
| D-003 | 2026-07-25 | Secrets, OAuth provider setup, Supabase project connection, and Vercel account access require user authorization and never enter Git. | User | Active |

## Confirmed product decisions

- **Brief: Concept 01 — Tip Tap Games.** Chosen for deterministic demo, zero external AI dependency in the critical path, and graceful degradation (any single game can be cut without breaking the feed).
- **Creative direction: coin-op arcade nostalgia.** See `design.md`. Nostalgia must read as *behavior* — attract mode, three-letter initials, machine copy — not as pixel-art decoration.
- **Stack:** Next.js 16 App Router, React 19, Tailwind v4, Supabase (Postgres + OAuth), zod for score validation.
- **Identity ladder:** guest device ID → three-letter initials on a qualifying run → OAuth only when a score is worth keeping. Guest scores merge on sign-in.

## Game component contract

Every game in `src/games/<slug>/` exports a component conforming to one interface. The feed owns lifecycle; the game owns only its mechanic.

```ts
export type GameProps = {
  /** True only while this card is the active snap target. Mount work is fine
   *  when false; no rAF loop, timer, or audio may run when false. */
  active: boolean;
  /** True when on-screen but not yet touched — run the autopilot demo loop. */
  attract: boolean;
  /** Call on every score change. The feed renders the readout; games never
   *  draw their own score chrome. */
  onScore: (score: number) => void;
  /** Call once when a run terminates. Triggers initials capture + persistence. */
  onGameOver: (finalScore: number) => void;
};
```

Hard rules for every game:

1. **One mechanic**, understandable in two seconds, one thumb, endless or round-based — never timer-forced.
2. **Hard stop on `active === false`.** Cancel every `requestAnimationFrame`, timer and audio node. Zombie loops across cards are the single most likely bug in this build.
3. **No score chrome.** Report via `onScore`; the feed draws it.
4. **Code-native geometry only** — no sprite sheets, no raster assets.
5. **Server-validated scores.** Client score is a claim; the write path caps and validates it.

## Open questions

_(Record only blockers or decisions that require the other owner or the user. Include the impacted file or flow and a proposed resolution.)_

## Handoff log

Append-only. Every completed checkpoint must include the completed work, affected files, validation, next owner, and unresolved blocker.

| Date / time | Agent | Completed work | Files affected | Validation | Next owner | Unresolved blocker |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-25 18:30 EAT | Codex | Established the shared collaboration protocol, including ownership, locks, decision records, start-of-work checks, and handoffs. | `COORDINATION.md` | Reviewed clean worktree and last two commits before update. | Both | None. |
| 2026-07-25 19:05 EAT | Claude | Lead review of `1ea1527`. Two P0 brief violations, three P1 defects, two P2. Full findings and fixes in `REVIEW-01.md`. | `REVIEW-01.md` | Ran `pnpm typecheck` and `pnpm lint` — both clean. Read all of `src/` and the migration. | Codex | P0-1 `Slipstream` has no collision detection and is unplayable; P0-2 timed rounds violate the DoD. Both block submission. |
| 2026-07-25 19:40 EAT | Claude | Data-layer and auth review in `REVIEW-02.md`, plus a DoD progress assessment (~55%). Adds P0-3 (migration slug set blocks the P0-1 rename), P1-1 (sign-in merge orphans the player's device id and zeroes their best), P1-2 (score endpoint trivially spoofable on a public livestream), P1-3 (feed is not endless). Combined REVIEW-01+02 priority order recorded. | `REVIEW-02.md`, `COORDINATION.md` | Static read of `score-persistence.ts`, `score-store.ts`, both API routes, both auth routes, and the migration. **No runtime verification — Supabase has never been connected.** | Codex | Three questions for Codex at the foot of `REVIEW-02.md`. Deployment and Supabase credentials still blocked on the user. |
| 2026-07-25 20:05 EAT | Codex | Replaced the timed placeholder lineup with the three specified game contracts: Burn-In recall, LCD Run discrete lane/collision survival, and Signal Lock drag/hold. Updated game registry, local seed boards, API duration guards, the unrun migration slug/check/seed set, and the account merge's device-id handoff. | `src/components/tip-tap-arcade.tsx`, `src/lib/games.ts`, `src/lib/score-store.ts`, `src/app/api/scores/route.ts`, `src/lib/score-persistence.ts`, `supabase/migrations/20260725190000_tip_tap_games.sql` | `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass. Browser/play QA and live Supabase verification remain pending credentials. | Claude review → Codex P1 hardening | P1: current three-card feed is not endless; initials/attract are not yet implemented; score API anti-cheat and Supabase/OAuth need live verification. |
| 2026-07-25 20:35 EAT | Claude | Browser QA at 375x812 on `4fce984`. Played all three games. Root cause found: inline `onFinish` in every game loop's dep array rebuilds the loop on every render. Eleven CSS classes referenced in JSX are undefined. Signal Lock reads clientX against a vertical rail. All three cards overflow the viewport. Findings in `REVIEW-03.md`. | `REVIEW-03.md`, `COORDINATION.md` | Live browser: measured card heights (971/911/905 vs 812 viewport), enumerated undefined classes against loaded stylesheets, screenshotted all three cards. | Codex | R-1 through R-4 block a demo. `design.md` tokens still unapplied after three requests. |
| 2026-07-25 21:20 EAT | Claude | **Presentation layer built.** R-1 loop stability (per-game `finish` ref, `onFinish` out of every dep array; Signal Lock's `running` ref promoted to state so the loop actually starts). R-2 all eleven undefined classes written. R-3 Signal Lock now reads `clientY`/`rect.height` + arrow-key support. R-4 cards locked to `100dvh`, leaderboard demoted to a compact rail. R-6 phosphor tokens applied (P1 green / P3 amber / P4 white-blue), scanline overlay, machine-voice chrome. R-7 LCD Run now guarantees a reachable open lane. | `src/app/globals.css` (rewritten), `src/components/tip-tap-arcade.tsx` (loop + axis + fairness only — no logic rewrites) | `pnpm typecheck` and `pnpm lint` clean. Browser-verified at 375x812: card heights now 812/812/812 (was 971/911/905), `.burn-grid` resolves to 3 equal columns, Burn-In flash measured at a clean 999ms burn via MutationObserver. | Codex | Attract mode, three-letter initials and the endless feed are still unbuilt. Supabase/OAuth still unverified. Anti-cheat (`REVIEW-02` P1-2) and `memoryLeaderboard` per-player dedupe (`REVIEW-03` R-5) remain Codex-owned and open. |
| 2026-07-25 21:55 EAT | Claude | **Direction reset + game rebuild.** User rated all three previous games 2/10 (generic, soulless) and asked for a TikTok/Shorts feel. Replaced Burn-In / LCD Run / Signal Lock with **Stack / Slice / Color Rings** (`src/games/`), each on a distinct input model. Visual direction pivoted from CRT phosphor to vivid per-game colour worlds — full-bleed stage, overlaid chrome, right-hand action rail. Endless feed via a recycling deck. `memoryLeaderboard` deduped per player (R-5). Migration slugs, seeds and score caps updated. | `src/games/*` (new), `src/components/tip-tap-arcade.tsx`, `src/app/globals.css`, `src/lib/games.ts`, `src/lib/score-store.ts`, `src/app/api/scores/route.ts`, `supabase/migrations/*`, `design.md`, `GAMES.md` | `pnpm typecheck` and `pnpm lint` clean. Stack verified with real synthetic clicks (tower builds, blocks narrow, score climbs). **rAF motion could NOT be verified — the automation browser pane reports `visibilityState: hidden` and throttles rAF to 0 frames.** Needs a human pass on a real device. | Codex | Attract mode, three-letter initials, audio and haptics all unbuilt. Anti-cheat (`REVIEW-02` P1-2), the sign-in merge fix (`REVIEW-02` P1-1), and live Supabase/OAuth verification remain Codex-owned and open. |
| 2026-07-25 22:20 EAT | Claude | **Codex put on point for Switchback** (user decision). Wrote `CODEX-BRIEF.md`: mechanic spec, blockout-before-art build order, house art direction from the locked poster, asset policy, and mandatory verification protocol. Design authority for `design.md` and `GAMES.md` handed to Codex for this game; Claude reviews rather than overwrites. | `CODEX-BRIEF.md`, `COORDINATION.md` | None — planning checkpoint. | Codex | Codex to blockout Switchback and get the user playing it before any art work. Claude retains `globals.css` and the feed shell. |
| 2026-07-25 23:10 EAT | Codex | **Switchback blockout.** Replaced the first feed game's prototype component with a plain-shape zigzag runner: pointer-down flips lane, missed vertices and piston impacts end an endless run, and a close escape earns a bonus. Added the pure frame-rate-independent simulation and a deterministic scripted test. Deliberately did not begin the art or juice pass. | `src/games/switchback/simulation.ts`, `src/games/switchback/simulation.test.ts`, `src/games/switchback/switchback.tsx`, `src/components/tip-tap-arcade.tsx`, `src/lib/games.ts`, `package.json`, `pnpm-lock.yaml` | **Ran:** test first (confirmed red: missing simulation module), then `pnpm test -- src/games/switchback/simulation.test.ts` (2 passing deterministic tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`. **Not verified:** live pointer/touch events, visible rAF motion, or a real phone. Browser automation's LAN navigation timed out and its localhost route was policy-blocked, so no synthetic click was used and no motion claim is made. | User phone test → Codex feel pass | User must play `http://192.168.31.223:3000/` on a phone before art work. |
| 2026-07-25 23:42 EAT | Codex | **Switchback input repair.** Found that the old HTTP LAN preview lacked `crypto.randomUUID`, preventing the client from becoming interactive. Added a tested guest-ID fallback, made the stage visuals non-interactive so the play surface receives pointer input, added click/keyboard fallback behind pointer-down, gave the first turn a learnable window, and constrained the playfield above the feed chrome. Replaced the broken dev preview with the working production LAN server on port 3000. | `src/lib/client-id.ts`, `src/lib/client-id.test.ts`, `src/components/tip-tap-arcade.tsx`, `src/games/switchback/simulation.ts`, `src/games/switchback/simulation.test.ts`, `src/games/switchback/switchback.tsx`, `COORDINATION.md` | **Ran:** new client-ID test red (missing module) then green; `pnpm test -- src/lib/client-id.test.ts src/games/switchback/simulation.test.ts` (5 passing), `pnpm typecheck`, `pnpm lint`, `pnpm build`. **Visible Chrome, HTTP LAN, real coordinate/DOM input:** first click changed `Tap to start` → `Tap to flip`; second click advanced score `0` → `2`; no game-over and no console errors. Screenshot inspected after the run. **Not verified:** physical touch on the user's phone after this fix; no art/juice pass started. | User phone test → Codex feel pass | User to test the updated production preview at `http://192.168.31.223:3000/`; art stays blocked until the mechanic feels right. |
| 2026-07-26 00:05 EAT | Codex | **Switchback endless-runner rebuild.** Replaced the timing-toggle prototype with a fixed-runner, three-lane scrolling road. Left/right input moves one lane; parameterized pistons and spikes enter from the horizon; deterministic row generation always leaves an adjacent safe lane; shield, score-boost, and coin pickups add recovery/reward states. Applied the poster's ink/cobalt/vermilion/amber/cream language and fixed the post-death instruction overlap. | `src/games/switchback/simulation.ts`, `src/games/switchback/simulation.test.ts`, `src/games/switchback/switchback.tsx`, `src/games/switchback/switchback.module.css`, `src/lib/games.ts`, `design-qa.md`, `COORDINATION.md` | **TDD:** replaced the test contract first and observed four expected failures, then `pnpm test -- src/games/switchback/simulation.test.ts` passed (6 total suite tests). `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass. **Visible 390×844 in-app browser:** card/stage measured 390×844 with no overflow; real coordinate input moved runner x=172 → x≈239 → x=172; fresh-tab interaction changed start controls to running controls; visible rAF advanced score to 017; no framework overlay or console warnings/errors. `design-qa.md` final result: passed. **Not verified:** physical touch on the user's phone after this rebuild. | User phone feel pass → Codex art/juice pass | Final wordmark/grain and particle/audio polish intentionally wait for phone feedback. |

## Commit and release rules

- Keep commits atomic and scoped to one owner or one shared-file handoff.
- Never bundle a design decision with unrelated implementation work.
- A release checkpoint requires: clean working tree, pushed commit, deployment URL, repository URL, completed submission packet, and recorded technical/design verification.
- Claude verifies submission narrative and visual direction before deployment; Codex verifies functionality, database security, performance, and public smoke testing.
