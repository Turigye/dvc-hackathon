import { NextResponse } from "next/server";
import { z } from "zod";
import { isGameSlug } from "@/lib/games";
import { recordMemoryScore } from "@/lib/score-store";
import { recordPersistentScore } from "@/lib/score-persistence";

// Not `.uuid()`: LAN/HTTP previews have no Web Crypto, so `createClientId`
// falls back to a non-UUID guest id. The columns are `text` to match.
const idSchema = z.string().min(8).max(64).regex(/^[A-Za-z0-9-]+$/);
const scoreSchema = z.object({ game: z.string(), score: z.number().int().nonnegative(), roundId: idSchema, durationMs: z.number().int().positive(), deviceId: idSchema });

export async function POST(request: Request) {
  const parsed = scoreSchema.safeParse(await request.json());
  if (!parsed.success || !isGameSlug(parsed.data.game)) return NextResponse.json({ error: "Invalid score submission." }, { status: 400 });
  const { game, score, durationMs, deviceId } = parsed.data;
  const minimumDuration = 1_000;
  if (durationMs < minimumDuration) return NextResponse.json({ error: "Round ended too quickly." }, { status: 422 });
  try {
    const storedInSupabase = await recordPersistentScore(game, deviceId, score, parsed.data.roundId, durationMs);
    if (!storedInSupabase) recordMemoryScore(game, deviceId, score);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Score is outside this game’s limits." }, { status: 422 });
  }
}
