# Submission Packet — Thumbtrance

## Links

- **Public deployment URL:** https://thumbtrance.vercel.app
- **GitHub repository URL:** https://github.com/Turigye/dvc-hackathon
- **Submission form / confirmation:** _(paste after submitting)_

## Project name

**Thumbtrance**

## One-line description

A vertical feed of instantly playable mini-games — the same thumb, the same trance, the same infinite scroll, except you are the one playing.

## Description (20+ characters, for the form)

Thumbtrance replaces the passive short-form feed with an active one. Every full-screen card is a different playable mini-game that starts the moment it lands on screen — no menu, no tutorial, no login wall. Swipe when you are bored and a completely different mechanic is already running. Eight games ship across five input models: tap-timing, press-and-hold, target-tapping, swipe-to-cut and tap-to-rotate. Scores persist to Postgres, every game has a live leaderboard, and guests claim a place on it with three arcade initials before ever creating an account.

I built the game simulations, the feed runtime, the scoring and identity layer, and the audio system personally. Every simulation is a pure, deterministic, frame-rate-independent function separated from rendering, which is what let me unit-test fairness — Switchback has tests proving no hazard configuration is unavoidable and that a passive player is always eventually caught while a skilled one can escape.

## Judge access

- **Test account:** none required. The feed opens straight into a playable game as a guest.
- **Test password / passcode:** n/a
- **Seed data or setup steps:** none. Leaderboards contain live scores.
- **Optional:** Google or Discord sign-in claims guest scores to an account. Guests can also claim a leaderboard slot with three-letter arcade initials, no account needed.

## Known limitations

- Game art is deliberate flat geometry; the art pass was in progress at submission.
- Score validation is capped server-side per game but not fully hardened against a determined attacker.

## Demo script

1. **Problem and user (15s)** — Short-form feeds won by removing every decision before the dopamine, but they made you passive. Thumbtrance keeps the exact same gesture and makes you the player.
2. **Primary workflow (60–90s)** — Open the URL on a phone. A game is already running; play it. Swipe up — a completely different mechanic is already running. Play, die, watch the score land on the live board, claim it with three initials. Tap the trophy to see everyone else's scores. Swipe again.
3. **Differentiator and technical execution (30s)** — Switchback is the signature game: the runner is locked to a zigzag ribbon and its rail *inverts at every vertex*, so the same tap means different things depending on where you are. A pursuer closes steadily and is pushed back only by taking risks, which makes safe play the losing strategy. All eight simulations are pure and unit-tested, all audio is procedurally synthesised with zero sound files, and everything is code-drawn with no stock assets anywhere.
4. **Close (15s)** — Live at thumbtrance.vercel.app, eight games, persistent leaderboards, guest-first.

## AI models and tools used

Claude Opus 5 via Claude Code (game simulations, runtime, scoring, audio, deployment) and OpenAI Codex (schema, auth, art generation), coordinated through a shared `COORDINATION.md` protocol in the repository.

## Release checks

- [x] Complete primary journey works in a clean browser session
- [x] Desktop and mobile layouts verified (390×844 first)
- [x] Working deployment is public and judge-testable
- [x] Lint, typecheck, production build and 27 unit tests pass
- [x] Persistence verified end-to-end against production
- [ ] Final incognito pass on a real phone
- [x] No secrets committed; `.env*` gitignored
