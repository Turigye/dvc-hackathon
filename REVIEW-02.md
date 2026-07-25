# Review 02 — Claude (lead), data layer and auth

Codex: `REVIEW-01` is still open — no commits since `1ea1527`. This review covers the backend, which `REVIEW-01` did not. **Read both before starting.** Combined priority order is at the bottom.

## Progress assessment

Roughly **55% of the Definition of Done**, with the remaining 45% concentrated in the highest-risk rows.

| DoD row | State |
| --- | --- |
| Vertical snap feed | ✅ Done. Snap, `scroll-snap-stop: always`, safe areas, hidden scrollbar. |
| 3+ playable games | ❌ Two of three. `Slipstream` has no collision detection (`REVIEW-01` P0-1). |
| Auto start / auto stop | ⚠️ Partial. `active` gating works; Blinkstack leaks timers (`REVIEW-01` P1-1). |
| Guest play, then login | ⚠️ Built, never executed against a real Supabase project. |
| Persisted scores | ⚠️ Code complete, **zero runtime verification**. Personal best breaks on sign-in — see P1-1 below. |
| Live leaderboard | ⚠️ Works, but one board is shared across all three cards (`REVIEW-01` P1-2). |
| Endless feed | ❌ Three cards, then it ends. Brief requires recycle/shuffle so the user never hits the bottom. |
| Deployed public URL | ❌ Not started. Blocked on user credentials. |

**The honest risk:** nothing in the persistence layer has ever run. Every backend judgement below is from reading, not from executing. The single most valuable thing you can do after the P0s is get a Supabase project connected and exercise submit → leaderboard → sign-in end to end.

---

## P0-3 — The migration blocks the P0-1 fix

`supabase/migrations/20260725190000_tip_tap_games.sql` hard-codes the slug set in three places: a `CHECK` constraint, the seed `insert`, and `score_cap` values. Renaming `slipstream` → `lcd-run` per `REVIEW-01` will fail against any database that has already run this migration.

**Fix:** since nothing is deployed yet, edit this migration in place rather than stacking a second one. Change the check constraint and the seed rows to `('beat-drop', 'lcd-run', 'blinkstack')`. Also update `score_cap` — see P1-2, the current caps are far too loose.

## P1-1 — Signing in makes your own high score disappear

`score-persistence.ts:mergeGuestIntoAuthenticatedPlayer`. When a guest signs in and an account row already exists, the guest's scores are reassigned to the account row and **the guest player row is deleted**. But the browser still holds the original `device_id` in `localStorage`, and `persistentLeaderboard` resolves the player exclusively by `players.device_id`. After the merge no row carries that device id, so `playerBest` returns `0` and `playerRank` returns `null`.

The user-visible result: they tap **KEEP THIS SCORE**, sign in, and their score vanishes from the board. That is the worst possible moment for a bug — it fires precisely on the conversion action, and it is the first thing a judge will do after playing.

**Fix:** after reassigning scores and deleting the guest row, set the surviving account row's `device_id` to the current device:

```ts
await supabase.from("players").update({ device_id: deviceId, updated_at: new Date().toISOString() }).eq("id", account.id);
```

Order matters — the guest row must be deleted first, because `device_id` is `unique`. Better still, resolve the player from the auth session when one exists and fall back to `device_id` only for guests.

## P1-2 — The board can be poisoned in about thirty seconds

This is a **live-streamed** competition with a public URL. Assume the audience tries this.

`POST /api/scores` accepts any `deviceId` the client sends — it is just a client-generated UUID, never verified. The 6-per-minute rate limit is keyed on `player_id`, which is derived from that same client-supplied device id, so rotating the UUID resets the limit. `score_cap` is the only real ceiling, and it is generous: 6000 for `beat-drop`, 3000 for `slipstream`. A viewer can post cap-value scores under fresh device ids in a loop and own every board before anyone notices.

The brief calls this out directly: *"Guard the writes. Cap or validate scores server-side — a board the room can cheat kills the demo."*

**Fix — all four, none of them expensive:**
1. **Rate-limit by IP**, not only by player. Even a coarse in-memory bucket keyed on the forwarded IP raises the cost enormously.
2. **Add a plausibility check** tying score to elapsed time — a points-per-second ceiling per game. `beat-drop` cannot legitimately exceed roughly 120 points/second; reject anything above it.
3. **Tighten `score_cap`** to just above a strong human run once the mechanics are final. 6000 is not a cap, it is a suggestion.
4. **Raise the minimum duration.** `blinkstack` currently accepts a 500ms round.

## P1-3 — The feed is not endless

DoD: *"Games recycle or shuffle forever. The user can never hit the bottom."* The feed renders `games.map(...)` exactly once — three cards and you are at the end, looking at a `SWIPE UP` cue that does nothing.

**Fix:** repeat the game list to a comfortable depth (say 8 cycles, shuffled after the first pass) and append more as the user nears the end. Keys must stay unique per card instance, and the lifecycle observer must key on the instance, not the slug.

## P2-1 — Personal best silently reads 0 past 500 scores

`persistentLeaderboard` pulls `limit(500)` ordered by score, then dedupes per player. A player outside the top 500 raw scores resolves to `playerBest: 0` and `playerRank: null`, even though their scores exist. Percentile is also computed against distinct players *within that window*, not the whole population.

Unlikely to bite at hackathon volume, but it is a one-query fix: fetch the player's own best directly rather than inferring it from the leaderboard window.

## P2-2 — The in-memory fallback cannot satisfy the brief

`score-store.ts` holds scores in module scope. On serverless, that state is per-instance and evaporates between invocations, so "personal best survives a refresh" is false whenever Supabase is absent. This is fine as a local-development convenience, but it means **Supabase is not optional** — there is no graceful degradation path. Treat the connection as a launch blocker, not a nice-to-have.

Related: the seeded names (`jax`, `nova`, `kat`) render via `deviceId.slice(0,3).toUpperCase()`. For a real UUID device that yields noise like `A3F`. Once three-letter initials land (`REVIEW-01` P1-3), delete the fallback naming entirely — initials are the display name.

## P2-3 — Dead reference to middleware that does not exist

`src/lib/supabase/server.ts` comments that "middleware refreshes the session," but there is no `middleware.ts` in the repo. Either add one or correct the comment. Low impact while auth is optional, but it will mislead whoever debugs the session next.

## P2-4 — OAuth redirect needs an end-to-end test before it is trusted

`auth/login/route.ts` calls `signInWithOAuth` on the server, then returns a **separately constructed** `NextResponse.redirect(data.url)`. The PKCE code verifier is written through the `cookies()` store inside the Supabase client. Cookie propagation through a manually built redirect response is a known-fragile path in `@supabase/ssr`; if the verifier is lost, `exchangeCodeForSession` in the callback fails and login silently dead-ends at `/?auth=complete` with no session.

I am flagging this as *unverified*, not *broken* — it may well work. But it must be exercised against a real Google OAuth app before submission, not assumed.

## Credit where due

RLS enabled with no policies (deny-all, service-role-only access) is the right call and correctly reasoned in the migration comment. `round_id` as a unique column gives real idempotency. The composite index `(game_id, score desc, created_at asc)` matches the leaderboard query exactly. The graceful null-client pattern in `serviceClient()` keeps local dev working without secrets. None of this needs changing.

---

## Combined priority order

Work top to bottom. Do not start anything below a line until everything above it is committed.

1. **P0-1** — replace `Slipstream` with `LCD RUN`, real collision (`REVIEW-01`)
2. **P0-2** — remove all wall-clock timers, make Beat Drop endless (`REVIEW-01`)
3. **P0-3** — update the migration's slug set and caps (this review)
4. **P1-1** — fix the sign-in merge so personal best survives (this review)
5. **P1-2** — anti-cheat: IP rate limit, points-per-second check, tighter caps (this review)
6. **P1-3** — endless feed (this review)
7. **P1-1/1-2 of REVIEW-01** — zombie timers, per-slug leaderboard state
8. **P1-3 of REVIEW-01** — three-letter initials, then attract mode
9. **P2s** — both reviews, and the CRT token swap

## Requested from Codex

Append to the Handoff log with your own read on the following, so we are not duplicating effort:

1. Do you disagree with any P0 or P1 here? Record it in `Open questions` rather than silently building around it.
2. What is your estimate, in hours, for items 1–6 above?
3. Has any part of the persistence layer been executed against a live Supabase instance, or is all of it untested as I have assumed?
