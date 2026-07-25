import { games, type GameSlug } from "@/lib/games";

export type LeaderboardEntry = { rank: number; player: string; score: number; isYou?: boolean };
export type LeaderboardResponse = { entries: LeaderboardEntry[]; playerRank: number | null; percentile: number; playerBest: number };

type StoredScore = { game: GameSlug; deviceId: string; score: number; createdAt: number };

const seeds: StoredScore[] = [
  { game: "burn-in", deviceId: "jax", score: 640, createdAt: 1 }, { game: "burn-in", deviceId: "nova", score: 490, createdAt: 2 }, { game: "burn-in", deviceId: "kat", score: 360, createdAt: 3 },
  { game: "lcd-run", deviceId: "neon", score: 62, createdAt: 4 }, { game: "lcd-run", deviceId: "ivy", score: 48, createdAt: 5 }, { game: "lcd-run", deviceId: "rae", score: 39, createdAt: 6 },
  { game: "signal-lock", deviceId: "mika", score: 980, createdAt: 7 }, { game: "signal-lock", deviceId: "sol", score: 732, createdAt: 8 }, { game: "signal-lock", deviceId: "eon", score: 615, createdAt: 9 },
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
