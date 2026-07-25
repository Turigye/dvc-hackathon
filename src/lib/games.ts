export const gameSlugs = ["stack", "slice", "color-rings"] as const;

export type GameSlug = (typeof gameSlugs)[number];

export type GameDefinition = {
  slug: GameSlug;
  title: string;
  kicker: string;
  accent: "magenta" | "acid" | "electric";
  description: string;
  scoreCap: number;
};

export const games: GameDefinition[] = [
  { slug: "stack", title: "Stack", kicker: "Tap to drop.", accent: "magenta", description: "Precision tower", scoreCap: 4_000 },
  { slug: "slice", title: "Slice", kicker: "Swipe to cut.", accent: "acid", description: "Blade combos", scoreCap: 9_000 },
  { slug: "color-rings", title: "Color Rings", kicker: "Spin to match.", accent: "electric", description: "Colour reflex", scoreCap: 3_000 },
];

export const isGameSlug = (value: string): value is GameSlug => gameSlugs.includes(value as GameSlug);
