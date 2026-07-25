export const gameSlugs = ["burn-in", "lcd-run", "signal-lock"] as const;

export type GameSlug = (typeof gameSlugs)[number];

export type GameDefinition = {
  slug: GameSlug;
  title: string;
  kicker: string;
  accent: "phosphor" | "lcd" | "cobalt";
  description: string;
  scoreCap: number;
};

export const games: GameDefinition[] = [
  { slug: "burn-in", title: "Burn-In", kicker: "Tap where it burned.", accent: "phosphor", description: "Phosphor recall", scoreCap: 2_560 },
  { slug: "lcd-run", title: "LCD Run", kicker: "Tap to switch lanes.", accent: "lcd", description: "Lane survival", scoreCap: 1_800 },
  { slug: "signal-lock", title: "Signal Lock", kicker: "Hold the signal.", accent: "cobalt", description: "Frequency control", scoreCap: 4_800 },
];

export const isGameSlug = (value: string): value is GameSlug => gameSlugs.includes(value as GameSlug);
