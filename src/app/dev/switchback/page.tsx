import { RAIL_OFFSET, railPath, railPoint, ribbonPath } from "@/games/switchback/geometry";
import {
  LOOKAHEAD,
  createSwitchbackState,
  hazardCovers,
  offsetOf,
  segmentOf,
  step,
  type Rail,
  type SwitchbackState,
} from "@/games/switchback/simulation";

/**
 * Design QA filmstrip. Renders real gameplay states by stepping the pure
 * simulation — no animation frames, so it screenshots reliably in any browser,
 * including headless ones that throttle rAF to zero.
 */

const VIEW_H = 212;
const RUNNER_SCREEN_Y = 0.55;
const FRAME_MS = 16;

/** A competent autopilot: flip only when the current rail is about to be lethal. */
function autoplay(state: SwitchbackState): boolean {
  const segment = segmentOf(state.progress);
  const ahead = offsetOf(state.progress) + 0.04;
  const here = state.rail;
  const there: Rail = here === 0 ? 1 : 0;
  const doomed = state.hazards.some((h) => h.segment === segment && hazardCovers(h, here, ahead));
  const escapeSafe = !state.hazards.some((h) => h.segment === segment && hazardCovers(h, there, ahead));
  return doomed && escapeSafe;
}

function advance(state: SwitchbackState, ms: number) {
  let current = state;
  for (let elapsed = 0; elapsed < ms && !current.failed; elapsed += FRAME_MS) {
    current = step(current, FRAME_MS, { flip: autoplay(current) });
  }
  return current;
}

function Frame({ state, label }: { state: SwitchbackState; label: string }) {
  const segment = segmentOf(state.progress);
  const runner = railPoint(segment, offsetOf(state.progress), state.rail);
  const cameraY = runner.y - VIEW_H * RUNNER_SCREEN_Y;
  const first = segment - 3;
  const last = segment + LOOKAHEAD;

  return (
    <figure className="frame">
      <svg viewBox={`0 ${cameraY} 100 ${VIEW_H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
        <polyline className="ribbon-wall" points={ribbonPath(first, last)} strokeWidth={RAIL_OFFSET * 2} transform="translate(0 5)" />
        <polyline className="ribbon" points={ribbonPath(first, last)} strokeWidth={RAIL_OFFSET * 2} />
        <polyline className="rail-line" points={railPath(first, last, 0)} />
        <polyline className="rail-line" points={railPath(first, last, 1)} />
        {state.drags.map((drag) => {
          const start = railPoint(drag.segment, drag.from, drag.rail);
          const end = railPoint(drag.segment, drag.to, drag.rail);
          const x = (start.x + end.x) / 2;
          const y = (start.y + end.y) / 2;
          const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
          return (
            <g key={`d${drag.id}`} className={`band-mark is-${drag.kind}`} transform={`translate(${x} ${y}) rotate(${angle})`}>
              {drag.kind === "sprint"
                ? <path d="M-9 -6 L-2 0 L-9 6 M-1 -6 L6 0 L-1 6 M8 -6 L15 0 L8 6" />
                : <path d="M-13 -7 L-8 7 M-7 -7 L-2 7 M-1 -7 L4 7 M5 -7 L10 7 M11 -7 L16 7" />}
            </g>
          );
        })}

        {state.hazards.map((hazard) => {
          const start = railPoint(hazard.segment, hazard.from, hazard.rail);
          const end = railPoint(hazard.segment, Math.min(1, hazard.to), hazard.rail);
          return (
            <g key={hazard.id} className={`hazard is-${hazard.kind}`}>
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} strokeWidth={hazard.kind === "spikes" ? 7 : 10} strokeLinecap={hazard.kind === "piston" ? "butt" : "round"} />
            </g>
          );
        })}
        {state.pickups.filter((pickup) => !pickup.taken).map((pickup) => {
          const { x, y } = railPoint(pickup.segment, pickup.at, pickup.rail);
          return <circle key={pickup.id} className={`pickup is-${pickup.kind}`} cx={x} cy={y} r={5} />;
        })}
        {state.chaserActive && (() => {
          const trail = Math.max(0, state.progress - state.chaseGap);
          const spot = railPoint(segmentOf(trail), offsetOf(trail), state.rail);
          return <circle className="chaser" cx={spot.x} cy={spot.y} r={7.5} />;
        })()}
        <circle className={`runner ${state.shield > 0 ? "has-shield" : ""}`} cx={runner.x} cy={runner.y} r={6.5} />
      </svg>
      <figcaption>
        <b>{label}</b>
        <span>score {state.score} · rail {state.rail} · seg {segment}</span>
        <span>{state.chaserActive ? `chaser gap ${state.chaseGap.toFixed(2)}` : "chaser asleep"}{state.failed ? ` · DIED (${state.failure})` : ""}</span>
      </figcaption>
    </figure>
  );
}

export default function SwitchbackQA() {
  let state = createSwitchbackState({ seed: 12 });
  const frames: { state: SwitchbackState; label: string }[] = [];
  for (let index = 0; index < 6; index++) {
    state = advance(state, index === 0 ? 900 : 4200);
    frames.push({ state, label: `t+${((index === 0 ? 0.9 : 0.9 + index * 4.2)).toFixed(1)}s` });
  }

  return (
    <main className="qa">
      <h1>Switchback — design QA</h1>
      <p className="qa-note">
        Real simulation states, stepped without animation frames. Autopilot dodges only when its rail is about to be lethal.
      </p>
      <ul className="legend">
        <li><i className="swatch runner" /> <b>Runner</b> — you. Auto-runs; tap flips rails. Rail inverts at every vertex.</li>
        <li><i className="swatch hazard" /> <b>Piston</b> — short lethal block on one rail. Be on the other one.</li>
        <li><i className="swatch spikes" /> <b>Spike run</b> — long lethal stretch. Commit before you enter it.</li>
        <li><i className="swatch sweeper" /> <b>Sweeper</b> — starts on one rail, crosses to the other mid-segment. Position alone will not save you.</li>
        <li><i className="swatch coin" /> <b>Coin</b> — +5 and pushes the pursuer back. Always sits on the risky rail.</li>
        <li><i className="swatch shield" /> <b>Shield</b> — absorbs one hit.</li>
        <li><i className="swatch boost" /> <b>Boost</b> — speed up, big pushback on the pursuer.</li>
        <li><i className="swatch chaser" /> <b>Pursuer</b> — closes steadily. Near misses, coins and boosts push it back. Playing safe loses.</li>
        <li><i className="swatch vertex" /> <b>Vertex</b> — the fold. Your rail inverts here whether you tap or not.</li>
      </ul>
      <div className="strip">
        {frames.map((frame) => <Frame key={frame.label} {...frame} />)}
      </div>
    </main>
  );
}
