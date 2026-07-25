import { games, type GameSlug } from "@/lib/games";

export type LeaderboardEntry = { rank: number; player: string; score: number; isYou?: boolean };
export type LeaderboardResponse = { entries: LeaderboardEntry[]; playerRank: number | null; percentile: number; playerBest: number };

type StoredScore = { game: GameSlug; deviceId: string; score: number; createdAt: number };

const seeds: StoredScore[] = [
  { game: "beat-drop", deviceId: "jax", score: 512, createdAt: 1 }, { game: "beat-drop", deviceId: "nova", score: 476, createdAt: 2 }, { game: "beat-drop", deviceId: "kat", score: 431, createdAt: 3 },
  { game: "slipstream", deviceId: "neon", score: 913, createdAt: 4 }, { game: "slipstream", deviceId: "ivy", score: 788, createdAt: 5 }, { game: "slipstream", deviceId: "rae", score: 742, createdAt: 6 },
  { game: "blinkstack", deviceId: "mika", score: 310, createdAt: 7 }, { game: "blinkstack", deviceId: "sol", score: 272, createdAt: 8 }, { game: "blinkstack", deviceId: "eon", score: 244, createdAt: 9 },
];

const memoryScores = [...seeds];
const playerName = (deviceId: string) => deviceId === "you" ? "YOU" : deviceId.slice(0, 3).toUpperCase();

export function recordMemoryScore(game: GameSlug, deviceId: string, score: number) {
  const gameConfig = games.find((item) => item.slug === game);
  if (!gameConfig || score < 0 || score > gameConfig.scoreCap) throw new Error("Invalid score.");
  memoryScores.push({ game, deviceId, score, createdAt: Date.now() });
}

export function memoryLeaderboard(game: GameSlug, deviceId?: string): LeaderboardResponse {
  const all = memoryScores.filter((score) => score.game === game).sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);
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
