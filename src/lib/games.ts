export const gameSlugs = ["switchback", "tether", "skyline", "pulse", "reflex", "overload", "swarm", "slice"] as const;

export type GameSlug = (typeof gameSlugs)[number];

export type GameDefinition = {
  slug: GameSlug;
  title: string;
  kicker: string;
  accent: "cobalt" | "magenta" | "acid" | "electric" | "ember" | "toxic" | "violet" | "void";
  description: string;
  scoreCap: number;
  rules: { action: string; score: string; danger: string };
};

export const games: GameDefinition[] = [
  { slug: "switchback", title: "Switchback", kicker: "Tap to flip.", accent: "cobalt", description: "Zigzag runner", scoreCap: 4_000, rules: { action: "TAP TO FLIP", score: "PASS BENDS + GRAB", danger: "DODGE HAZARDS + CHASER" } },
  { slug: "tether", title: "Tether", kicker: "Tap to let go.", accent: "void", description: "Orbital climb", scoreCap: 20_000, rules: { action: "TAP TO LET GO", score: "THREAD THE NEXT RING", danger: "MISS IT AND YOU FALL" } },
  { slug: "skyline", title: "Skyline", kicker: "Tap to stack.", accent: "magenta", description: "Precision tower", scoreCap: 4_000, rules: { action: "TAP TO DROP", score: "STACK PRECISELY", danger: "MISSES END THE RUN" } },
  { slug: "pulse", title: "Pulse Weave", kicker: "Tap to swap.", accent: "electric", description: "Twin-signal phase run", scoreCap: 6_000, rules: { action: "TAP TO SWAP", score: "MATCH THE LIVE PHASE", danger: "WRONG PHASE BREAKS" } },
  { slug: "reflex", title: "Reflex", kicker: "Tap on the arc.", accent: "ember", description: "Timing dial", scoreCap: 6_000, rules: { action: "TAP ON THE ARC", score: "BUILD A STREAK", danger: "A MISS ENDS THE RUN" } },
  { slug: "overload", title: "Overload", kicker: "Hold, then release.", accent: "toxic", description: "Charge control", scoreCap: 6_000, rules: { action: "HOLD + RELEASE", score: "LAND IN THE SAFE BAND", danger: "OVERLOAD ENDS THE RUN" } },
  { slug: "swarm", title: "Swarm", kicker: "Catch pale. Avoid red.", accent: "violet", description: "Queen hunt", scoreCap: 6_000, rules: { action: "TAP PALE BUGS", score: "FILL BLOOM + BEAT QUEEN", danger: "AVOID RED · 3 ESCAPES" } },
  { slug: "slice", title: "Slice", kicker: "Swipe to cut.", accent: "acid", description: "Blade combos", scoreCap: 9_000, rules: { action: "SWIPE TARGETS", score: "CHAIN YOUR CUTS", danger: "AVOID BOMBS · 3 MISSES" } },
];

export const isGameSlug = (value: string): value is GameSlug => gameSlugs.includes(value as GameSlug);
