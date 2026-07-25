import { NextResponse } from "next/server";
import { isGameSlug } from "@/lib/games";
import { memoryLeaderboard } from "@/lib/score-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get("game");
  const deviceId = searchParams.get("device") ?? undefined;
  if (!game || !isGameSlug(game)) return NextResponse.json({ error: "Unknown game." }, { status: 400 });
  return NextResponse.json(memoryLeaderboard(game, deviceId));
}
