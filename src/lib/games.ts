export const gameSlugs = ["switchback", "skyline", "pulse", "reflex", "overload", "swarm", "slice"] as const;

export type GameSlug = (typeof gameSlugs)[number];

export type GameDefinition = {
  slug: GameSlug;
  title: string;
  kicker: string;
  accent: "cobalt" | "magenta" | "acid" | "electric" | "ember" | "toxic" | "violet";
  description: string;
  scoreCap: number;
};

export const games: GameDefinition[] = [
  { slug: "switchback", title: "Switchback", kicker: "Tap to flip.", accent: "cobalt", description: "Zigzag runner", scoreCap: 4_000 },
  { slug: "skyline", title: "Skyline", kicker: "Tap to stack.", accent: "magenta", description: "Precision tower", scoreCap: 4_000 },
  { slug: "pulse", title: "Pulse", kicker: "Tap to rise.", accent: "electric", description: "Gate flight", scoreCap: 6_000 },
  { slug: "reflex", title: "Reflex", kicker: "Tap on the arc.", accent: "ember", description: "Timing dial", scoreCap: 6_000 },
  { slug: "overload", title: "Overload", kicker: "Hold, then release.", accent: "toxic", description: "Charge control", scoreCap: 6_000 },
  { slug: "swarm", title: "Swarm", kicker: "Tap the swarm.", accent: "violet", description: "Target hunt", scoreCap: 6_000 },
  { slug: "slice", title: "Slice", kicker: "Swipe to cut.", accent: "acid", description: "Blade combos", scoreCap: 9_000 },
];

export const isGameSlug = (value: string): value is GameSlug => gameSlugs.includes(value as GameSlug);
