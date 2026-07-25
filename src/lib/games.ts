export const gameSlugs = ["beat-drop", "slipstream", "blinkstack"] as const;

export type GameSlug = (typeof gameSlugs)[number];

export type GameDefinition = {
  slug: GameSlug;
  title: string;
  kicker: string;
  duration: number;
  accent: "blue" | "red" | "amber";
  description: string;
  scoreCap: number;
};

export const games: GameDefinition[] = [
  { slug: "beat-drop", title: "Beat Drop", kicker: "Tap on the target", duration: 30, accent: "amber", description: "Precision timing", scoreCap: 6000 },
  { slug: "slipstream", title: "Slipstream", kicker: "Drag through the gaps", duration: 20, accent: "red", description: "Survival run", scoreCap: 3000 },
  { slug: "blinkstack", title: "Blinkstack", kicker: "Repeat the pattern", duration: 45, accent: "blue", description: "Flash memory", scoreCap: 5000 },
];

export const isGameSlug = (value: string): value is GameSlug => gameSlugs.includes(value as GameSlug);
