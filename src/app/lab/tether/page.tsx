import { Tether } from "@/games/tether/tether";
import "./lab.css";

/** Isolated lab route. Not part of the feed and not linked from anywhere. */
export default function TetherLab() {
  return (
    <main className="lab">
      <Tether />
    </main>
  );
}
