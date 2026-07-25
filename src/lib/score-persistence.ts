import { createClient } from "@supabase/supabase-js";
import type { GameSlug } from "@/lib/games";
import type { LeaderboardResponse } from "@/lib/score-store";

type ScoreRow = { score: number; created_at: string; player_id: string; players: { device_id: string | null; display_name: string | null } | null };

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function recordPersistentScore(game: GameSlug, deviceId: string, score: number, roundId: string, durationMs: number) {
  const supabase = serviceClient();
  if (!supabase) return false;
  const { data: gameRow, error: gameError } = await supabase.from("games").select("id, score_cap").eq("slug", game).single();
  if (gameError || !gameRow || score > gameRow.score_cap) throw new Error("Game configuration is unavailable.");
  const { data: player, error: playerError } = await supabase.from("players").upsert({ device_id: deviceId, updated_at: new Date().toISOString() }, { onConflict: "device_id" }).select("id").single();
  if (playerError || !player) throw new Error("Player could not be created.");
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase.from("scores").select("id", { count: "exact", head: true }).eq("player_id", player.id).gte("created_at", oneMinuteAgo);
  if ((count ?? 0) >= 6) throw new Error("Scoreboard is cooling down.");
  const { error } = await supabase.from("scores").insert({ player_id: player.id, game_id: gameRow.id, score, round_id: roundId, duration_ms: durationMs });
  if (error) throw new Error("Score already recorded.");
  return true;
}

export async function persistentLeaderboard(game: GameSlug, deviceId?: string): Promise<LeaderboardResponse | null> {
  const supabase = serviceClient();
  if (!supabase) return null;
  const { data: gameRow } = await supabase.from("games").select("id").eq("slug", game).single();
  if (!gameRow) return null;
  const { data, error } = await supabase.from("scores").select("score, created_at, player_id, players(device_id, display_name)").eq("game_id", gameRow.id).order("score", { ascending: false }).order("created_at", { ascending: true }).limit(500);
  if (error || !data) return null;
  const bestByPlayer = new Map<string, ScoreRow>();
  for (const row of data as unknown as ScoreRow[]) if (!bestByPlayer.has(row.player_id)) bestByPlayer.set(row.player_id, row);
  const rows = [...bestByPlayer.values()];
  const playerIndex = rows.findIndex((row) => row.players?.device_id === deviceId);
  const playerBest = playerIndex >= 0 ? rows[playerIndex].score : 0;
  return {
    entries: rows.slice(0, 10).map((row, index) => ({ rank: index + 1, player: row.players?.display_name ?? (row.players?.device_id === deviceId ? "YOU" : "PLAYER"), score: row.score, isYou: row.players?.device_id === deviceId })),
    playerRank: playerIndex >= 0 ? playerIndex + 1 : null,
    percentile: playerIndex >= 0 ? Math.max(1, Math.round(((rows.length - playerIndex) / rows.length) * 100)) : 0,
    playerBest,
  };
}

export async function mergeGuestIntoAuthenticatedPlayer(deviceId: string, authUserId: string) {
  const supabase = serviceClient();
  if (!supabase) return;
  const { data: guest } = await supabase.from("players").select("id").eq("device_id", deviceId).maybeSingle();
  const { data: account } = await supabase.from("players").select("id").eq("auth_user_id", authUserId).maybeSingle();
  if (!guest && !account) { await supabase.from("players").insert({ device_id: deviceId, auth_user_id: authUserId }); return; }
  if (guest && account && guest.id !== account.id) { await supabase.from("scores").update({ player_id: account.id }).eq("player_id", guest.id); await supabase.from("players").delete().eq("id", guest.id); return; }
  if (guest) await supabase.from("players").update({ auth_user_id: authUserId, updated_at: new Date().toISOString() }).eq("id", guest.id);
}
