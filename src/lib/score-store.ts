import { games, type GameSlug } from "@/lib/games";

export type LeaderboardEntry = { rank: number; player: string; score: number; isYou?: boolean };
export type LeaderboardResponse = { entries: LeaderboardEntry[]; playerRank: number | null; percentile: number; playerBest: number };

type StoredScore = { game: GameSlug; deviceId: string; score: number; createdAt: number };

const seeds: StoredScore[] = [
  { game: "switchback", deviceId: "jax", score: 320, createdAt: 1 }, { game: "switchback", deviceId: "nova", score: 250, createdAt: 2 }, { game: "switchback", deviceId: "kat", score: 180, createdAt: 3 },
  { game: "skyline", deviceId: "ivy", score: 210, createdAt: 10 }, { game: "skyline", deviceId: "jax", score: 160, createdAt: 11 },
  { game: "pulse", deviceId: "sol", score: 180, createdAt: 20 }, { game: "reflex", deviceId: "mika", score: 240, createdAt: 21 },
  { game: "slice", deviceId: "neon", score: 1240, createdAt: 4 }, { game: "slice", deviceId: "ivy", score: 890, createdAt: 5 }, { game: "slice", deviceId: "rae", score: 640, createdAt: 6 },
];

const memoryScores = [...seeds];
const playerName = (deviceId: string) => deviceId === "you" ? "YOU" : deviceId.slice(0, 3).toUpperCase();

export function recordMemoryScore(game: GameSlug, deviceId: string, score: number) {
  const gameConfig = games.find((item) => item.slug === game);
  if (!gameConfig || score < 0 || score > gameConfig.scoreCap) throw new Error("Invalid score.");
  memoryScores.push({ game, deviceId, score, createdAt: Date.now() });
}

export function memoryLeaderboard(game: GameSlug, deviceId?: string): LeaderboardResponse {
  const ranked = memoryScores.filter((score) => score.game === game).sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);
  const seen = new Set<string>();
  const all = ranked.filter((score) => { if (seen.has(score.deviceId)) return false; seen.add(score.deviceId); return true; });
  const yours = all.filter((score) => score.deviceId === deviceId);
  const playerBest = yours[0]?.score ?? 0;
  const playerRank = playerBest ? all.findIndex((score) => score.score === playerBest && score.deviceId === deviceId) + 1 : null;
  return {
    entries: all.slice(0, 10).map((score, index) => ({ rank: index + 1, player: playerName(score.deviceId), score: score.score, isYou: score.deviceId === deviceId })),
    playerRank,
    percentile: playerRank ? Math.max(1, Math.round(((all.length - playerRank + 1) / all.length) * 100)) : 0,
    playerBest,
  };
}
