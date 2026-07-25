export type GameResult = { score: number; durationMs: number; label: string };
export type GameProps = {
  /** True only while this card is the active snap target. No rAF, timer or audio may run when false. */
  active: boolean;
  /** Called once when a run terminates. Triggers persistence. */
  onFinish: (result: GameResult) => void;
  /** Notifies the feed when a run starts or ends, so chrome can clear out of the way. */
  onRunningChange?: (running: boolean) => void;
};
