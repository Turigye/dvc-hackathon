export type GameResult = { score: number; durationMs: number; label: string };
export type GameProps = {
  /** True only while this card is the active snap target. No rAF, timer or audio may run when false. */
  active: boolean;
  /** Called once when a run terminates. Triggers persistence. */
  onFinish: (result: GameResult) => void;
};
