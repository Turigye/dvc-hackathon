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

_(empty — add `- [agent] files: … | change: … | release: …` before shared-file work)_

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

## Commit and release rules

- Keep commits atomic and scoped to one owner or one shared-file handoff.
- Never bundle a design decision with unrelated implementation work.
- A release checkpoint requires: clean working tree, pushed commit, deployment URL, repository URL, completed submission packet, and recorded technical/design verification.
- Claude verifies submission narrative and visual direction before deployment; Codex verifies functionality, database security, performance, and public smoke testing.
